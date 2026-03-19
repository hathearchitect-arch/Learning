import type { S3EventRecord, Context, SQSEvent } from 'aws-lambda';
import {
  PutObjectCommand,
  S3Client,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { dbAwsDataApi as db } from './db';
import { file } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  BedrockAgentClient,
  IngestKnowledgeBaseDocumentsCommand,
} from '@aws-sdk/client-bedrock-agent';
import { Resource } from 'sst';
import * as Sentry from '@sentry/node';
import { sentryDsn, sentryEnvironment, isProductionEnvironment } from '@/lib/constants';

// Initialize Sentry for Lambda monitoring
Sentry.init({
  dsn: sentryDsn,
  enabled: isProductionEnvironment,
  environment: sentryEnvironment,
  tracesSampleRate: 1.0,
  enableLogs: true,
  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ['log', 'error', 'warn'] }),
  ],
});

const { logger } = Sentry;

const bedrockClient = new BedrockAgentClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

const knowledgebaseDocumentsBucketName =
  Resource.KnowledgebaseDocumentsBucket.name;

async function ingestKnowledgebaseDocuments(event: SQSEvent, context: Context) {
  return Sentry.startSpan(
    {
      op: 'lambda.handler',
      name: 'Ingest Knowledgebase Documents Handler',
    },
    async (span) => {
      span.setAttribute('lambda.requestId', context.awsRequestId);
      span.setAttribute('sqs.recordCount', event.Records.length);

      logger.info('Starting knowledgebase document ingestion', {
        requestId: context.awsRequestId,
        recordCount: event.Records.length,
      });

      try {
        let notification: S3EventRecord;

        try {
          notification = JSON.parse(event.Records[0].body);
        } catch (error) {
          logger.error('Failed to parse SQS record body', {
            error: error instanceof Error ? error.message : String(error),
            recordBody: event.Records[0].body,
          });
          Sentry.captureException(error);
          return;
        }

        if (!notification.s3 || !notification.s3.object) {
          logger.warn('Invalid S3 notification structure', { notification });
          return;
        }

        const eventName = notification.eventName;
        const s3Key = notification.s3.object.key;
        const bucketName = notification.s3.bucket.name;

        span.setAttribute('s3.key', s3Key);
        span.setAttribute('s3.eventName', eventName);
        span.setAttribute('s3.bucket', bucketName);

        if (eventName !== 'ObjectCreated:Put') {
          logger.info('Skipping non-put event', { eventName, s3Key });
          return;
        }

        logger.info('Processing file ingestion', { s3Key, eventName });

        // if the object key ends in .metadata.json, skip it
        // this should be already handled up stream by the fifo forwarder
        if (s3Key.endsWith('.metadata.json')) {
          logger.warn(
            'Skipping metadata file (should have been handled upstream)',
            { s3Key },
          );
          return;
        }

        // split the key to get the file name and organization slug
        const keyParts = s3Key.split('/');
        const organizationSlug = keyParts[0];
        const s3FileName = keyParts[keyParts.length - 1];

        span.setAttribute('organization.slug', organizationSlug);
        span.setAttribute('file.name', s3FileName);

        let uploadedFile: any;

        await Sentry.startSpan(
          {
            op: 'lambda.database_lookup',
            name: 'Find File in Database',
          },
          async (dbSpan) => {
            try {
              // find the file in the database that this key corresponds to...
              uploadedFile = await db.query.file.findFirst({
                where: and(eq(file.s3Key, s3Key), eq(file.isVectorized, false)),
              });

              if (!uploadedFile) {
                logger.warn('No file found in database for S3 key', { s3Key });
                return;
              }

              if (uploadedFile.isVectorized) {
                logger.info('File is already vectorized, skipping', {
                  fileId: uploadedFile.id,
                  s3Key,
                });
                return;
              }

              dbSpan.setAttribute('file.id', uploadedFile.id);
              dbSpan.setAttribute(
                'file.organizationId',
                uploadedFile.organizationId,
              );
              logger.info('Found file in database', {
                fileId: uploadedFile.id,
                fileName: uploadedFile.name,
                organizationId: uploadedFile.organizationId,
              });
            } catch (error) {
              logger.error('Failed to lookup file in database', {
                s3Key,
                error: error instanceof Error ? error.message : String(error),
              });
              Sentry.captureException(error);
              throw error;
            }
          },
        );

        if (!uploadedFile) {
          return;
        }

        await Sentry.startSpan(
          {
            op: 'lambda.metadata_creation',
            name: 'Create and Upload Metadata',
          },
          async (metadataSpan) => {
            // Trigger Ingestion into the knowledgebase
            // https://docs.aws.amazon.com/bedrock/latest/userguide/kb-direct-ingestion-add.html
            // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/bedrock-agent/command/IngestKnowledgeBaseDocumentsCommand/

            // upload the metadata.json file to the
            const metadataJsonKey = `${uploadedFile.s3Key}.metadata.json`;
            metadataSpan.setAttribute('metadata.s3Key', metadataJsonKey);

            try {
              // create the metadata object
              let metadata = {
                metadataAttributes: {
                  fileId: uploadedFile.id,
                  organizationId: uploadedFile.organizationId,
                  organizationSlug: organizationSlug,
                  fileName: uploadedFile.name,
                  fileMetadataS3Key: metadataJsonKey,
                  createdAt: uploadedFile.createdAt.toISOString(),
                  updatedAt: uploadedFile.updatedAt.toISOString(),
                },
              };

              // check for object metadata (custom metadata provided in API call on file upload)
              // merge the metadata attributes...
              try {
                const command = new HeadObjectCommand({
                  Bucket: bucketName,
                  Key: s3Key,
                });
                const customMetadataResponse = await s3Client.send(command);
                if (customMetadataResponse.Metadata) {
                  metadata = {
                    metadataAttributes: {
                      ...customMetadataResponse.Metadata,
                      ...metadata.metadataAttributes, // ! THIS MUST COME SECOND WHEN THE OBJECTS ARE MERGED SO THAT OUR ATTRIBUTES CANNOT BE OVERWRITTEN
                    },
                  };
                  logger.info('Merged custom metadata with file metadata', {
                    fileId: uploadedFile.id,
                    customMetadataKeys: Object.keys(
                      customMetadataResponse.Metadata,
                    ),
                  });
                }
              } catch (error) {
                logger.warn('Error adding custom metadata to metadata.json', {
                  fileId: uploadedFile.id,
                  error: error instanceof Error ? error.message : String(error),
                });
              }

              const metadataJsonContent = JSON.stringify(metadata, null, 2);
              const putMetadataCommand = new PutObjectCommand({
                Bucket: knowledgebaseDocumentsBucketName,
                Key: metadataJsonKey,
                Body: metadataJsonContent,
                ContentType: 'application/json',
              });

              logger.info('Uploading metadata.json to S3', { metadataJsonKey });
              await s3Client.send(putMetadataCommand);
              logger.info('Successfully uploaded metadata.json', {
                metadataJsonKey,
              });
            } catch (error) {
              logger.error('Failed to create or upload metadata', {
                fileId: uploadedFile.id,
                error: error instanceof Error ? error.message : String(error),
              });
              Sentry.captureException(error);
              throw error;
            }
          },
        );

        await Sentry.startSpan(
          {
            op: 'lambda.bedrock_ingestion',
            name: 'Ingest Document to Bedrock Knowledgebase',
          },
          async (bedrockSpan) => {
            bedrockSpan.setAttribute(
              'knowledgebase.id',
              process.env.KNOWLEDGEBASE_ID || '',
            );
            bedrockSpan.setAttribute(
              'knowledgebase.dataSourceId',
              process.env.KNOWLEDGEBASE_DATA_SOURCE_ID || '',
            );
            bedrockSpan.setAttribute('file.id', uploadedFile.id);

            const metadataJsonKey = `${uploadedFile.s3Key}.metadata.json`;

            const ingestDocumentCommand =
              new IngestKnowledgeBaseDocumentsCommand({
                knowledgeBaseId: process.env.KNOWLEDGEBASE_ID,
                dataSourceId: process.env.KNOWLEDGEBASE_DATA_SOURCE_ID,
                documents: [
                  {
                    metadata: {
                      type: 'S3_LOCATION',
                      s3Location: {
                        uri: `s3://${knowledgebaseDocumentsBucketName}/${metadataJsonKey}` as string,
                      },
                    },
                    content: {
                      dataSourceType: 'S3',
                      s3: {
                        s3Location: {
                          uri: `s3://${knowledgebaseDocumentsBucketName}/${uploadedFile.s3Key}` as string,
                        },
                      },
                    },
                  },
                ],
              });

            try {
              const bedrockResult = await bedrockClient.send(
                ingestDocumentCommand,
              );
              // check the status of the ingestion and while the status is not completed or failed
              const initialIngestionStatus =
                bedrockResult.documentDetails?.[0]?.status;

              bedrockSpan.setAttribute(
                'bedrock.initialStatus',
                initialIngestionStatus || 'unknown',
              );

              logger.info('Submitted document for ingestion to knowledgebase', {
                fileName: uploadedFile.name,
                organizationSlug,
                initialIngestionStatus,
                fileId: uploadedFile.id,
                documentUri: `s3://${knowledgebaseDocumentsBucketName}/${uploadedFile.s3Key}`,
              });
            } catch (error) {
              logger.error('Failed to ingest document into knowledgebase', {
                fileName: uploadedFile.name,
                fileId: uploadedFile.id,
                error: error instanceof Error ? error.message : String(error),
                documentUri: `s3://${knowledgebaseDocumentsBucketName}/${uploadedFile.s3Key}`,
              });
              Sentry.captureException(error);
              throw new Error(
                `Failed to ingest document ${uploadedFile.name} into knowledgebase`,
              );
            }
          },
        );

        logger.info('Successfully completed document ingestion process', {
          fileId: uploadedFile.id,
          fileName: uploadedFile.name,
          organizationSlug,
        });
      } catch (error) {
        logger.error('Failed to ingest knowledgebase documents', {
          error: error instanceof Error ? error.message : String(error),
          requestId: context.awsRequestId,
        });
        Sentry.captureException(error);
        throw error;
      }
    },
  );
}

export const handler = ingestKnowledgebaseDocuments;
