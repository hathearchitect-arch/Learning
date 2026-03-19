import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import type { S3Event, S3EventRecord, SQSEvent } from 'aws-lambda';
import { Resource } from 'sst';
import { createHash } from 'node:crypto';
import * as Sentry from '@sentry/node';
import { isProductionEnvironment, sentryDsn, sentryEnvironment } from '@/lib/constants';

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

const sqs = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });

const INGESTION_FIFO_QUEUE_URL = Resource.CaddieKnowledgebaseIngestionQueue.url;
const DELETION_FIFO_QUEUE_URL = Resource.CaddieKnowledgebaseDeletionQueue.url;

const forwardToIngestionFifoQueue = async (s3EventRecord: S3EventRecord) => {
  return Sentry.startSpan(
    {
      op: 'lambda.ingestion',
      name: 'Forward to Ingestion FIFO Queue',
    },
    async (span) => {
      const s3Key = s3EventRecord.s3.object.key;
      logger.info('Forwarding to ingestion FIFO queue', { s3Key });

      span.setAttribute('s3.key', s3Key);
      span.setAttribute('s3.bucket', s3EventRecord.s3.bucket.name);

      try {
        // create a hash of the s3 key
        const messageDeduplicationId = createHash('sha256')
          .update(s3Key)
          .digest('hex');

        await sqs.send(
          new SendMessageCommand({
            QueueUrl: INGESTION_FIFO_QUEUE_URL,
            MessageBody: JSON.stringify(s3EventRecord),
            MessageGroupId: 's3-knowledgebase-ingestion-events',
            MessageDeduplicationId: messageDeduplicationId,
          }),
        );

        span.setAttribute('sqs.messageDeduplicationId', messageDeduplicationId);
        logger.info('Successfully forwarded to ingestion FIFO queue', {
          s3Key,
          messageDeduplicationId,
        });
      } catch (error) {
        logger.error('Failed to forward to ingestion FIFO queue', {
          s3Key,
          error: error instanceof Error ? error.message : String(error),
        });
        Sentry.captureException(error);
        throw error;
      }
    },
  );
};

const forwardToDeletionFifoQueue = async (s3EventRecord: S3EventRecord) => {
  return Sentry.startSpan(
    {
      op: 'lambda.deletion',
      name: 'Forward to Deletion FIFO Queue',
    },
    async (span) => {
      const s3Key = s3EventRecord.s3.object.key;
      logger.info('Forwarding to deletion FIFO queue', { s3Key });

      span.setAttribute('s3.key', s3Key);
      span.setAttribute('s3.bucket', s3EventRecord.s3.bucket.name);

      try {
        // create a hash of the s3 key
        const messageDeduplicationId = createHash('sha256')
          .update(s3Key)
          .digest('hex');

        await sqs.send(
          new SendMessageCommand({
            QueueUrl: DELETION_FIFO_QUEUE_URL,
            MessageBody: JSON.stringify(s3EventRecord),
            MessageGroupId: 's3-knowledgebase-deletion-events',
            MessageDeduplicationId: messageDeduplicationId,
          }),
        );

        span.setAttribute('sqs.messageDeduplicationId', messageDeduplicationId);
        logger.info('Successfully forwarded to deletion FIFO queue', {
          s3Key,
          messageDeduplicationId,
        });
      } catch (error) {
        logger.error('Failed to forward to deletion FIFO queue', {
          s3Key,
          error: error instanceof Error ? error.message : String(error),
        });
        Sentry.captureException(error);
        throw error;
      }
    },
  );
};

export const handler = async (event: SQSEvent) => {
  return Sentry.startSpan(
    {
      op: 'lambda.handler',
      name: 'S3 Notifications FIFO Forwarder Handler',
    },
    async (span) => {
      span.setAttribute('sqs.recordCount', event.Records.length);
      logger.info('Processing SQS event', {
        recordCount: event.Records.length,
      });

      try {
        for (const record of event.Records) {
          await Sentry.startSpan(
            {
              op: 'lambda.record',
              name: 'Process SQS Record',
            },
            async (recordSpan) => {
              let s3Notifications: S3Event;

              try {
                s3Notifications = JSON.parse(record.body);
              } catch (error) {
                logger.error('Failed to parse SQS record body', {
                  error: error instanceof Error ? error.message : String(error),
                  recordBody: record.body,
                });
                Sentry.captureException(error);
                return;
              }

              if (!s3Notifications.Records) {
                logger.warn('No records found in S3 event, skipping', {
                  s3Notifications: JSON.stringify(s3Notifications),
                });
                return;
              }

              recordSpan.setAttribute(
                's3.notificationCount',
                s3Notifications.Records.length,
              );

              for (const s3Notification of s3Notifications.Records) {
                await Sentry.startSpan(
                  {
                    op: 'lambda.s3_notification',
                    name: 'Process S3 Notification',
                  },
                  async (notificationSpan) => {
                    const s3Key = s3Notification.s3.object.key;
                    const eventName = s3Notification.eventName;

                    notificationSpan.setAttribute('s3.key', s3Key);
                    notificationSpan.setAttribute('s3.eventName', eventName);
                    notificationSpan.setAttribute(
                      's3.bucket',
                      s3Notification.s3.bucket.name,
                    );

                    // if the object is a metadata file, we want to skip it
                    if (s3Key.endsWith('.metadata.json')) {
                      logger.info('Skipping metadata file', {
                        s3Key,
                        eventName,
                      });
                      return;
                    }

                    logger.info('Processing S3 event', { eventName, s3Key });

                    try {
                      // Ensure the event is an ObjectCreated event
                      if (eventName.startsWith('ObjectCreated')) {
                        // Forward the S3 event to the FIFO queue
                        await forwardToIngestionFifoQueue(s3Notification);
                      }

                      // if the event is a deletion event
                      if (eventName.startsWith('ObjectRemoved')) {
                        // Forward the S3 event to the Deletion queue
                        await forwardToDeletionFifoQueue(s3Notification);
                      }
                    } catch (error) {
                      logger.error('Failed to process S3 notification', {
                        eventName,
                        s3Key,
                        error:
                          error instanceof Error
                            ? error.message
                            : String(error),
                      });
                      Sentry.captureException(error);
                      throw error;
                    }
                  },
                );
              }
            },
          );
        }

        logger.info('Successfully processed all SQS records', {
          recordCount: event.Records.length,
        });
      } catch (error) {
        logger.error('Failed to process SQS event', {
          error: error instanceof Error ? error.message : String(error),
          recordCount: event.Records.length,
        });
        Sentry.captureException(error);
        throw error;
      }
    },
  );
};
