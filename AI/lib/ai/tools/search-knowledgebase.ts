import { tool, type DataStreamWriter } from 'ai';
import { z } from 'zod';
import type { Session, User } from 'better-auth';
import { customMetadataFilterFunctions } from '../custom-metadata-filters';
import { db } from '@/lib/db';
import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
  type RetrievalFilter,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { agent as agentSchema } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import * as Sentry from '@sentry/nextjs';

const bedrockKnowledgebaseId = process.env.BEDROCK_KNOWLEDGEBASE_ID;
const bedrockKnowledgebaseBucketName = process.env.KNOWLEDGEBASE_BUCKET_NAME;

const bedrockAgent = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

async function getAgent(organizationId: string, agentId: string) {
  return db.query.agent.findFirst({
    where: eq(agentSchema.id, agentId),
    with: {
      organization: true,
      folders: true,
    },
  });
}

type KnowledgeBaseSearchResult = {
  text: string | undefined;
  source: string | undefined;
  metadata: {
    fileType: string;
    fileName: string | undefined;
    createdAt: string | undefined;
    updatedAt: string | undefined;
  };
  score: number | undefined;
}

// use the bedrock runtime agent to search the knowledgebase
// return the documents that match the query back to the searchKnowledgebase tool
export async function retrieveBedrockKnowledgebaseDocuments(
  query: string,
  session: { session: Session; user: User },
  organizationId: string,
  agentId: string,
  requestMetadata: object | undefined,
  numberOfResults: number,
  similarityScoreThreshold: number,
) {
    return Sentry.startSpan(
      {
        op: 'http.server',
        name: 'GET /api/file/[fileId]',
      },
      async (span) => {
        // get the agent
        const agent = await getAgent(organizationId, agentId);
        if (!agent) {
          span.recordException(`Could not find agent with id ${agentId}`);
          throw new Error(`Agent with ID ${agentId} not found.`);
        }

        // return no results if the agent does not have any folders and custom filtering is not enabled
        if (agent?.folders.length === 0 && !agent.isCustomMetadataFilteringEnabled) {
          console.log(
            `Agent ${agentId} has no folders and custom metadata filtering is disabled.`,
          );
          span.addEvent('unable to find any folders, and custom metadata filtering is disabled');
          return [];
        }

        // Set the default filter for the organizationId and any folders that the agent has access to.
        // If there are no folders then return no documents. Always filter by organizationId
        const agentAssignedS3FolderPaths = agent.folders.map((folder) => ({
          startsWith: {
            key: 'fileMetadataS3Key',
            value: `${agent.organization.slug}/files/uploads/${folder.folderId}/`,
          },
        }));

        // if there is only one folder assigned we have to use the startsWith filter
        // if there are multiple folders assigned we can use the orAll filter
        // this is because orAll requires at least two conditions
        let retrieveCommandFilters: RetrievalFilter = {
          andAll: [
            {
              equals: {
                key: 'organizationId',
                value: organizationId,
              },
            },
            agentAssignedS3FolderPaths.length > 1
              ? {
                  orAll: agentAssignedS3FolderPaths,
                }
              : agentAssignedS3FolderPaths[0],
          ],
        };

        // if custom metadata filtering is enabled, we are then relying on the customer configuration to return
        // a valid retrieve command object. This will overwrite the standard filter above.
        // TODO @yourboijake - review to make sure this logic will work for your use case
        if (
          agent.isCustomMetadataFilteringEnabled &&
          agent.organization.customMetadataFilterFunction &&
          agent.organization.customMetadataFilterConfig
        ) {
          try {
            const requestBody = {
              organizationId,
              userId: session.user.id,
              metadata: requestMetadata,
            };
            const customRetrieveCommandFilters = await customMetadataFilterFunctions[
              agent.organization.customMetadataFilterFunction
            ](requestBody, agent.organization.customMetadataFilterConfig);

            retrieveCommandFilters = {
              andAll: [
                {
                  equals: {
                    key: 'organizationId',
                    value: organizationId,
                  },
                },
                customRetrieveCommandFilters,
              ],
            };
          } catch (error) {
            const errorMessage = `'encountered error calling custom metadata filter function: ${error}`;
            span.recordException(errorMessage)
            console.error(errorMessage);
          }
        }
        console.log('retrieveCommandFilters: ', JSON.stringify(retrieveCommandFilters));
        span.setAttribute('retrieveCommandFilters', JSON.stringify(retrieveCommandFilters));

        // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/bedrock-agent-runtime/command/RetrieveCommand/
        const command = new RetrieveCommand({
          knowledgeBaseId: bedrockKnowledgebaseId,
          retrievalQuery: {
            text: query,
          },
          retrievalConfiguration: {
            vectorSearchConfiguration: {
              numberOfResults: numberOfResults, // number of results to return
              filter: retrieveCommandFilters,
            },
          },
        });
        try {
          const knowledgebaseSearchResults = await bedrockAgent.send(command);
          if (knowledgebaseSearchResults.retrievalResults === undefined) {
            const errorMessage = `failure on retrieval for agent ${agent.id} on question ${query}. retrievalResults on knowledge base search returned undefined. Metadata from bedrock response: ${knowledgebaseSearchResults.$metadata}. Original search command: ${command.input}`;
            span.recordException(errorMessage)
          }

          const documents: Array<KnowledgeBaseSearchResult> | undefined = knowledgebaseSearchResults.retrievalResults?.map(
            (document) => ({
              text: document.content?.text,
              source: document.location?.s3Location?.uri,
              metadata: {
                fileType: (document.metadata?.fileName as string).split('.')[-1],
                fileName: (document.metadata?.fileName as string),
                createdAt: (document.metadata?.createdAt as string),
                updatedAt: (document.metadata?.updatedAt as string),
              },
              score: document.score,
            }),
          );
          const numberRetrievedDocuments = documents?.length ? documents.length : 0;
          const retrievedDocumentsSimilarityScores = documents ? documents.map(
            (document) => { 
              return JSON.stringify({
                filename: document.metadata.fileName, 
                score: document.score}) }
            ) : [];
          span.setAttribute('number of retrieved documents (before filtering for similarity scores)', numberRetrievedDocuments);
          span.setAttribute('similarity scores of all documents: ', retrievedDocumentsSimilarityScores);

          // only include documents that have a score above the threshold
          const filteredDocuments = documents?.filter(
            (doc) => doc.score && doc.score > similarityScoreThreshold,
          );
          return filteredDocuments || [];
        } catch (error) {
          const errorMessage = `Error on knowledge base retrieval: ${error}`;
          span.recordException(errorMessage)
          console.error(errorMessage);
          return [];
        }
      }
    )
  }

interface SearchKnowledgebaseProps {
  question: string;
  session: { session: Session; user: User };
  dataStream: DataStreamWriter;
  organizationId: string;
  agentId: string;
  requestMetadata: object | undefined;
  numberOfResults?: number;
  similarityScoreThreshold?: number;
}

export const searchKnowledgebase = ({
  question,
  session,
  dataStream,
  organizationId,
  agentId,
  requestMetadata,
  numberOfResults = 5, // default to 5 results
  similarityScoreThreshold = 0.5, // default to 0.5 similarity score
}: SearchKnowledgebaseProps) =>
  tool({
    description:
      'Search the knowledge base for relevant content based on users question.',
    parameters: z.object({
      question: z.string().describe('the exact users question'),
    }),
    execute: async () => {
      console.log(
        `Agent ${agentId} searching knowledgebase for ${numberOfResults} results with minimum similarity score of ${similarityScoreThreshold}:`,
        question,
      );

      let knowledgebaseSearchResults: Array<KnowledgeBaseSearchResult> = [];
      try {
        knowledgebaseSearchResults =
        await retrieveBedrockKnowledgebaseDocuments(
          question,
          session,
          organizationId,
          agentId,
          requestMetadata,
          numberOfResults,
          similarityScoreThreshold,
        );
      } catch(error) {
        console.error('encountered error searching knowledgebase: ', error);
      }

      console.log(
        `Agent ${agentId} retrieved ${knowledgebaseSearchResults.length} documents from knowledgebase for question:`,
        question,
      );

      return knowledgebaseSearchResults;
    },
  });
