// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../.sst/platform/config.d.ts" />

import { database } from './database';
import {
  awsRegion,
  awsAccountId,
  embeddingModelId,
  sentryEnvironment,
  sentryAuthToken,
} from './variables';

const inferenceProfileId = awsRegion?.split('-')[0].toLowerCase();
const embeddingModelArn = $interpolate`arn:aws:bedrock:${awsRegion}::foundation-model/${embeddingModelId}`;
export const knowledgebaseDocumentsBucket = new sst.aws.Bucket(
  'KnowledgebaseDocumentsBucket',
);

export const knowledgebaseStorageBucket = new sst.aws.Bucket(
  'KnowledgebaseStorageBucket',
);

const knowledgebaseDefaultIamRole = new aws.iam.Role(
  'KnowledgebaseDefaultIamRole',
  {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: 'bedrock.amazonaws.com',
    }),
  },
);

const invokeModelPermissionList = [embeddingModelArn];
const knowledgebaseDefaultIamPolicy = new aws.iam.Policy(
  'KnowledgebaseDefaultIamPolicy',
  {
    policy: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: [
            'bedrock:ListFoundationModels',
            'bedrock:ListCustomModels',
            'bedrock:ListInferenceProfiles',
            'bedrock:GetInferenceProfile',
            'bedrock:InvokeModel',
            'bedrock:StartIngestionJob',
          ],
          Resource: '*',
        },
        {
          Action: 'bedrock:InvokeModel',
          Resource: invokeModelPermissionList,
          Effect: 'Allow',
        },
        {
          Action: 'secretsmanager:GetSecretValue',
          Resource: [database.secretArn],
          Effect: 'Allow',
        },
        {
          Action: 'rds:DescribeDBClusters',
          Resource: [database.clusterArn],
          Effect: 'Allow',
        },
        {
          Action: [
            'rds-data:ExecuteStatement',
            'rds-data:BatchExecuteStatement',
          ],
          Resource: [database.clusterArn],
          Effect: 'Allow',
        },
        {
          Action: ['s3:GetObject', 's3:List*'],
          Resource: [
            knowledgebaseDocumentsBucket.arn,
            $interpolate`${knowledgebaseDocumentsBucket.arn}/*`,
            knowledgebaseStorageBucket.arn,
            $interpolate`${knowledgebaseStorageBucket.arn}/*`,
          ],
          Effect: 'Allow',
        },
        {
          Action: ['s3:PutObject', 's3:DeleteObject'],
          Resource: [
            knowledgebaseStorageBucket.arn,
            $interpolate`${knowledgebaseStorageBucket.arn}/*`,
          ],
          Effect: 'Allow',
        },
        {
          Action: 'iam:PassRole',
          Resource: knowledgebaseDefaultIamRole.arn,
          Effect: 'Allow',
        },
        {
          Action: 'bedrock:GetInferenceProfile',
          Resource: ['*'],
          Effect: 'Allow',
        },
      ],
    },
  },
);

const knowledgebaseDefaultIamRolePolicyAttachment =
  new aws.iam.PolicyAttachment('KnowledgebaseDefaultIamRolePolicyAttachment', {
    name: 'knowledgebase-attach-role-policy',
    roles: [knowledgebaseDefaultIamRole.name],
    policyArn: knowledgebaseDefaultIamPolicy.arn,
  });

export const knowledgebase = new awsnative.bedrock.KnowledgeBase(
  'CaddieKnowledgebase',
  {
    name: `${$app.name}-${$app.stage}-knowledgebase`,
    roleArn: knowledgebaseDefaultIamRole.arn,
    knowledgeBaseConfiguration: {
      type: 'VECTOR',
      vectorKnowledgeBaseConfiguration: {
        embeddingModelArn: embeddingModelArn,
        supplementalDataStorageConfiguration: {
          supplementalDataStorageLocations: [
            {
              supplementalDataStorageLocationType: 'S3',
              s3Location: {
                uri: $interpolate`s3://${knowledgebaseStorageBucket.name}`,
              },
            },
          ],
        },
      },
    },
    storageConfiguration: {
      type: 'RDS',
      rdsConfiguration: {
        credentialsSecretArn: database.secretArn,
        databaseName: database.database,
        resourceArn: database.clusterArn,
        tableName: 'embeddings',
        fieldMapping: {
          metadataField: 'metadata',
          primaryKeyField: 'id',
          textField: 'chunks',
          vectorField: 'embedding',
          customMetadataField: 'custom_metadata',
        },
      },
    },
  },
);

export const knowledgebaseS3DataSource = new aws.bedrock.AgentDataSource(
  'KnowledgebaseS3DataSource',
  {
  knowledgeBaseId: knowledgebase.knowledgeBaseId,
  name: 'S3KnowledgebaseDataSource',
  dataSourceConfiguration: {
    type: 'S3',
    s3Configuration: {
      bucketArn: knowledgebaseDocumentsBucket.arn,
    },
  },
});

// DOCUMENT INGESTION ///////////////////////////////////////////

// QUEUES
// Create a generic queue for reading in S3 notifications that we are interested in
const knowledgebaseS3NotificationsQueue = new sst.aws.Queue(
  'CaddieKnowledgebaseS3NotificationsQueue',
);

// FIFO Queue for Knowledgebase Ingestion
const knowledgebaseIngestionQueue = new sst.aws.Queue(
  'CaddieKnowledgebaseIngestionQueue',
  {
    fifo: {
      contentBasedDeduplication: true,
    },
  },
);

// FIFO Queue for Knowledgebase Document Deletion
const knowledgebaseDeletionQueue = new sst.aws.Queue(
  'CaddieKnowledgebaseDeletionQueue',
  {
    fifo: true,
  },
);

// Since S3 Bucket notifications cant send messages to FIFO queues, we need a forwarder
// Create a function that will read from our standard queue and forward the messages to the FIFO ingestion queue
const knowledgebaseS3NotificationFifoForwarder = new sst.aws.Function(
  'CaddieKnowledgebaseS3NotificationFifoForwarder',
  {
    handler: 'functions/knowledgebase-s3-notifications-fifo-forwarder.handler',
    link: [
      knowledgebaseS3NotificationsQueue,
      knowledgebaseIngestionQueue,
      knowledgebaseDeletionQueue,
    ],
    environment: {
      SENTRY_AUTH_TOKEN: sentryAuthToken,
      SENTRY_ENVIRONMENT: sentryEnvironment,
    },
  },
);

// Subscribe the FIFO forwarder to the S3 notifications queue
knowledgebaseS3NotificationsQueue.subscribe(
  knowledgebaseS3NotificationFifoForwarder.arn,
);

// Add S3 triggers to send ObjectCreated events to the Queue
knowledgebaseDocumentsBucket.notify({
  notifications: [
    {
      name: 'S3KnowledgebaseNotificationQueue',
      events: ['s3:ObjectCreated:Put', 's3:ObjectRemoved:Delete'], // Trigger on file uploads
      queue: knowledgebaseS3NotificationsQueue.arn,
    },
  ],
});

// Create the functions that will process documents from the ingestion and deletion queues
const knowledgebaseDocumentsIngestionFunction = new sst.aws.Function(
  'CaddieKnowledgebaseIngestionFunction',
  {
    handler: 'functions/knowledgebase-ingest-documents.handler',
    environment: {
      KNOWLEDGEBASE_ID: knowledgebase.id,
      KNOWLEDGEBASE_DATA_SOURCE_ID: knowledgebaseS3DataSource.dataSourceId,
      DATABASE_NAME: database.database,
      DATABASE_SECRET_ARN: database.secretArn,
      DATABASE_RESOURCE_ARN: database.clusterArn,
      SENTRY_AUTH_TOKEN: sentryAuthToken,
      SENTRY_ENVIRONMENT: sentryEnvironment,
    },
    concurrency: {
      reserved: 2,
    },
    //timeout: '5 minutes',
    link: [knowledgebaseIngestionQueue, knowledgebaseDocumentsBucket, database],
    permissions: [
      {
        actions: [
          'bedrock:StartIngestionJob',
          'bedrock:IngestKnowledgeBaseDocuments',
          'bedrock:GetKnowledgeBaseDocuments',
          'bedrock:ListKnowledgeBaseDocuments',
          'bedrock:DeleteKnowledgebaseDocuments',
        ],
        resources: [
          $interpolate`arn:aws:bedrock:${awsRegion}:${awsAccountId}:knowledge-base/${knowledgebase.id}`,
        ],
      },
    ],
  },
);

// Subscribe the ingestion function to the ingestion FIFO Queue
knowledgebaseIngestionQueue.subscribe(
  knowledgebaseDocumentsIngestionFunction.arn,
  {
    batch: {
      size: 1,
      partialResponses: false,
      window: '0 seconds',
    },
  },
);

//  DOCUMENT DELETION //////////////////////////////////////////////
// Create the function that will process documents from the deletion queue
const knowledgebaseDocumentsDeletionFunction = new sst.aws.Function(
  'CaddieKnowledgebaseDeletionFunction',
  {
    handler: 'functions/knowledgebase-delete-documents.handler',
    environment: {
      KNOWLEDGEBASE_ID: knowledgebase.id,
      KNOWLEDGEBASE_DATA_SOURCE_ID: knowledgebaseS3DataSource.dataSourceId,
      DATABASE_NAME: database.database,
      DATABASE_SECRET_ARN: database.secretArn,
      DATABASE_RESOURCE_ARN: database.clusterArn,
      SENTRY_AUTH_TOKEN: sentryAuthToken,
      SENTRY_ENVIRONMENT: sentryEnvironment,
    },
    concurrency: {
      reserved: 2,
    },
    // timeout: '5 minutes',
    link: [knowledgebaseDocumentsBucket, knowledgebaseDeletionQueue, database],
    permissions: [
      {
        actions: [
          'bedrock:StartIngestionJob',
          'bedrock:IngestKnowledgeBaseDocuments',
          'bedrock:GetKnowledgeBaseDocuments',
          'bedrock:ListKnowledgeBaseDocuments',
          'bedrock:DeleteKnowledgebaseDocuments',
        ],
        resources: [
          $interpolate`arn:aws:bedrock:${awsRegion}:${awsAccountId}:knowledge-base/${knowledgebase.id}`,
        ],
      },
    ],
  },
);

// Subscribe the deletion function to the deletion FIFO Queue
knowledgebaseDeletionQueue.subscribe(
  knowledgebaseDocumentsDeletionFunction.arn,
  {
    batch: {
      size: 1,
      partialResponses: false,
      window: '0 seconds',
    },
  },
);

// create Bedrock Guardrails
export const bedrockBasicGuardrail = new awsnative.bedrock.Guardrail(
  'BedrockBasicGuardrail',
  {
    name: `${$app.name}-${$app.stage}-BedrockBasicGuardrail`,
    blockedInputMessaging:
      'Sorry, but I cannot respond to your prompt since it violates our model usage policy', // message to return when the guardrail blocks a prompt
    blockedOutputsMessaging:
      'Sorry, answering this question would violate our model usage policy', // message to return when guardrail blocks a model response
    description:
      'Guardrail applied to all Caddie agents, includes: - Content filters, Prompt attacks, Denied topic: all mental health advice, Profanity filters, Contextual grounding check, relevance check',
    contentPolicyConfig: {
      filtersConfig: [
        {
          inputStrength: 'MEDIUM',
          outputStrength: 'HIGH',
          type: 'HATE',
          inputModalities: ['TEXT'],
          outputModalities: ['TEXT'],
        },
        {
          inputStrength: 'LOW',
          outputStrength: 'HIGH',
          type: 'INSULTS',
          inputModalities: ['TEXT'],
          outputModalities: ['TEXT'],
        },
        {
          inputStrength: 'MEDIUM',
          outputStrength: 'HIGH',
          type: 'SEXUAL',
          inputModalities: ['TEXT'],
          outputModalities: ['TEXT'],
        },
        {
          inputStrength: 'LOW',
          outputStrength: 'HIGH',
          type: 'VIOLENCE',
          inputModalities: ['TEXT'],
          outputModalities: ['TEXT'],
        },
        {
          inputStrength: 'NONE',
          outputStrength: 'MEDIUM',
          type: 'MISCONDUCT',
          inputModalities: ['TEXT'],
          outputModalities: ['TEXT'],
        },
      ],
    },
    topicPolicyConfig: {
      topicsConfig: [
        {
          name: 'Mental Health Advice',
          examples: [
            'Should I kill myself?',
            'I think I might be depressed, what do you think?',
            'Help me diagnose my mental health condition.',
          ],
          type: 'DENY',
          definition:
            'Any advice related to mental health issues, diagnosis of a mental health condition, or advice that would ordinarily be provided by a licensed counselor or psychiatrist.',
        },
      ],
    },
    wordPolicyConfig: {
      wordsConfig: [
        {
          text: 'placeholder',
        },
      ],
      managedWordListsConfig: [
        {
          type: 'PROFANITY',
        },
      ],
    },
  },
);

export const bedrockBasicGuardrailVersion = new aws.bedrock.GuardrailVersion(
  'BedrockBasicGuardrailVersion',
  {
    description: 'Version 1',
    guardrailArn: bedrockBasicGuardrail.guardrailArn,
    skipDestroy: true,
  },
);

export const bedrockBasicGuardrailLinkable = new sst.Linkable(
  'BedrockBasicGuardrailLinkable',
  {
    properties: {
      guardrailId: bedrockBasicGuardrail.guardrailId,
      version: bedrockBasicGuardrailVersion.version,
    },
  },
);
