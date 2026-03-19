import type { Context, SQSEvent, S3EventRecord } from 'aws-lambda';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  BedrockAgentClient,
  DeleteKnowledgeBaseDocumentsCommand,
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

async function deleteKnowledgebaseDocuments(event: SQSEvent, context: Context) {
  return Sentry.startSpan(
    {
      op: 'lambda.handler',
      name: 'Delete Knowledgebase Documents Handler',
    },
    async (span) => {
      span.setAttribute('lambda.requestId', context.awsRequestId);
      span.setAttribute('sqs.recordCount', event.Records.length);

      logger.info('Starting knowledgebase document deletion', {
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

        if (eventName !== 'ObjectRemoved:Delete') {
          logger.warn('Skipping non-delete event', { eventName, s3Key });
          return;
        }

        logger.info('Processing file deletion', { s3Key, eventName });

        // if the object key ends in .metadata.json, skip it
        // ideally, we should not trigger the lambda function for metadata files
        if (s3Key.endsWith('.metadata.json')) {
          logger.warn(
            'Skipping metadata file (should be handled in FIFO router)',
            { s3Key },
          );
          return;
        }

        await Sentry.startSpan(
          {
            op: 'lambda.delete_metadata',
            name: 'Delete Metadata File',
          },
          async (metadataSpan) => {
            // delete metadata.json
            const metadataJsonKey = `${s3Key}.metadata.json`;
            metadataSpan.setAttribute('s3.metadataKey', metadataJsonKey);

            try {
              const deleteMetadataCommand = new DeleteObjectCommand({
                Bucket: knowledgebaseDocumentsBucketName,
                Key: metadataJsonKey,
              });
              await s3Client.send(deleteMetadataCommand);
              logger.info('Deleted metadata file', { metadataJsonKey });
            } catch (error) {
              logger.error('Failed to delete metadata file', {
                metadataJsonKey,
                error: error instanceof Error ? error.message : String(error),
              });
              Sentry.captureException(error);
              // Continue with knowledgebase deletion even if metadata deletion fails
            }
          },
        );

        await Sentry.startSpan(
          {
            op: 'lambda.bedrock_delete',
            name: 'Delete from Bedrock Knowledgebase',
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

            // delete from knowledgebase
            const deleteKnowledgeBaseDocumentsCommand =
              new DeleteKnowledgeBaseDocumentsCommand({
                knowledgeBaseId: process.env.KNOWLEDGEBASE_ID,
                dataSourceId: process.env.KNOWLEDGEBASE_DATA_SOURCE_ID,
                documentIdentifiers: [
                  {
                    dataSourceType: 'S3',
                    s3: {
                      uri: `s3://${knowledgebaseDocumentsBucketName}/${s3Key}`,
                    },
                  },
                ],
              });

            try {
              const bedrockResult = await bedrockClient.send(
                deleteKnowledgeBaseDocumentsCommand,
              );

              const initialStatus = bedrockResult.documentDetails?.[0]?.status;
              bedrockSpan.setAttribute(
                'bedrock.initialStatus',
                initialStatus || 'unknown',
              );

              logger.info('Requested document deletion from knowledgebase', {
                s3Key,
                initialStatus,
                documentUri: `s3://${knowledgebaseDocumentsBucketName}/${s3Key}`,
              });
            } catch (error) {
              logger.error('Failed to delete document from knowledgebase', {
                s3Key,
                error: error instanceof Error ? error.message : String(error),
                documentUri: `s3://${knowledgebaseDocumentsBucketName}/${s3Key}`,
              });
              Sentry.captureException(error);
              throw new Error(
                `Failed to delete document ${s3Key} from knowledgebase`,
              );
            }
          },
        );

        logger.info('Successfully completed document deletion process', {
          s3Key,
        });
      } catch (error) {
        logger.error('Failed to delete knowledgebase documents', {
          error: error instanceof Error ? error.message : String(error),
          requestId: context.awsRequestId,
        });
        Sentry.captureException(error);
        throw error;
      }
    },
  );
}

export const handler = deleteKnowledgebaseDocuments;
