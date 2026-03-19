// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(input) {
    return {
      name: 'caddie',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: ['production'].includes(input?.stage),
      home: 'aws',
      providers: {
        aws: '6.83.0',
        'aws-native': '1.30.0',
      },
    };
  },
  async run() {
    const vars = await import('./infra/variables');
    const email = await import('./infra/email');
    const secrets = await import('./infra/secrets');
    const db = await import('./infra/database');
    const vpc = await import('./infra/network');
    const auth = await import('./infra/auth');
    const buckets = await import('./infra/buckets');
    const knowledgebase = await import('./infra/knowledgebase');
    const cluster = new sst.aws.Cluster('CaddieCluster', { vpc: vpc.vpc });

    new sst.x.DevCommand('PlaywrightTests', {
      dev: {
        command: 'pnpm run test',
        autostart: false,
      },
    });

    new sst.aws.Service('CaddieService', {
      cluster: cluster,
      cpu: '1 vCPU',
      memory: '2 GB',
      scaling: {
        min: vars.appEcsScalingMin,
        max: vars.appEcsScalingMax,
        cpuUtilization: 50,
        memoryUtilization: 50,
      },
      environment: {
        NEXT_PUBLIC_APP_URL: $dev
          ? 'http://localhost:3000'
          : $interpolate`https://${vars.domain}`,
        BETTER_AUTH_URL: $dev
          ? 'http://localhost:3000'
          : $interpolate`https://${vars.domain}`,
        BETTER_AUTH_SECRET: secrets.authSecret.value,
        BEDROCK_KNOWLEDGEBASE_ID: knowledgebase.knowledgebase.knowledgeBaseId,
        DATABASE_NAME: db.database.database,
        DATABASE_SECRET_ARN: db.database.secretArn,
        DATABASE_RESOURCE_ARN: db.database.clusterArn,
        KNOWLEDGEBASE_BUCKET_NAME:
          knowledgebase.knowledgebaseDocumentsBucket.name,
        KNOWLEDGEBASE_DATA_SOURCE_ID:
          knowledgebase.knowledgebaseS3DataSource.dataSourceId,
        KNOWLEDGEBASE_ID: knowledgebase.knowledgebase.knowledgeBaseId,
        SENTRY_DSN: vars.sentryDsn,
        SENTRY_AUTH_TOKEN: vars.sentryAuthToken,
        SENTRY_ENVIRONMENT: vars.sentryEnvironment,
        POSTGRES_URL: db.POSTGRES_URL,
        REDIS_URL: db.redisUrl,
      },
      link: [
        db.database,
        knowledgebase.knowledgebaseDocumentsBucket,
        knowledgebase.bedrockBasicGuardrailLinkable,
        secrets.authSecret,
        secrets.customMetadataEndpointKey,
        secrets.customMetadataEndpointSecret,
        buckets.appBucket,
        email.caddieEmail,
      ],
      loadBalancer: {
        domain: {
          name: vars.domain,
        },
        ports: [
          { listen: '80/http', forward: '3000/http' },
          { listen: '443/https', forward: '3000/http' },
        ],
        health: {
          '3000/http': {
            path: '/api/healthcheck',
          },
        },
      },
      dev: {
        command: 'npm run dev',
      },
      permissions: [
        {
          actions: [
            'bedrock:RetrieveAndGenerate',
            'bedrock:Retrieve',
            'bedrock:GetKnowledgeBaseDocuments',
          ],
          resources: [knowledgebase.knowledgebase.knowledgeBaseArn],
        },
        {
          actions: [
            'bedrock:InvokeModelWithResponseStream',
            'bedrock:InvokeModel',
            'bedrock:ApplyGuardrail',
          ],
          resources: ['*'],
        },
      ],
    });
    return {
      awsRegion: aws.getRegionOutput().name,
      awsAccountId: aws.getCallerIdentityOutput({}).accountId,
      DrizzleStudio: 'https://local.drizzle.studio',
      CaddieAppUrl: $dev
        ? 'http://localhost:3000'
        : $interpolate`https://${vars.domain}`,
    };
  },
});
