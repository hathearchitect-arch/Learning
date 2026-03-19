// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../.sst/platform/config.d.ts" />

// AWS CONFIGURATION
export const awsRegion = process.env.AWS_REGION;
export const awsAccountId = aws.getCallerIdentityOutput({}).accountId;

// CADDIE APP CONFIGURATION
// The domain for the application, used for email and other configurations.
// This should be set in the .env file or as an environment variable.
// It is expected to be in the format 'example.com'.
// In a deployed environment, this will be set to 'gocaddie.app' or 'gocaddie.dev'.
// In a local development or deployment, set this to be <stage>.gocaddie.dev. example: bcorcoran.gocaddie.dev
export const domain = process.env.APP_DOMAIN || '';

// ECS SCALING
export const appEcsScalingMin = Number(process.env.APP_ECS_SCALING_MIN) || 1;
export const appEcsScalingMax = Number(process.env.APP_ECS_SCALING_MAX) || 2;

// RDS CONFIGURATION
export const appRdsReplicaCount =
  Number(process.env.APP_RDS_REPLICA_COUNT) || 0;
export const appRdsScalingMin = Number(process.env.APP_RDS_SCALING_MIN) || 0.5;
export const appRdsScalingMax = Number(process.env.APP_RDS_SCALING_MAX) || 1;

// KNOWLEDGEBASE CONFIGURATION
export const embeddingModelId =
  process.env.APP_KNOWLEDGEBASE_EMBEDDING_MODEL_ID ||
  'amazon.titan-embed-text-v2:0';

// SENTRY CONFIGURATION
export const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN || '';
export const sentryEnvironment = process.env.SENTRY_ENVIRONMENT || 'development';
export const sentryDsn = process.env.SENTRY_DSN || '';
