// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../.sst/platform/config.d.ts" />

import { vpc } from './network';
import { appRdsReplicaCount, appRdsScalingMax, appRdsScalingMin } from './variables';

export const database = new sst.aws.Aurora('CaddieDatabase', {
  vpc: vpc,
  engine: 'postgres',
  version: '17',
  dataApi: true,
  replicas: appRdsReplicaCount,
  scaling: {
    min: $dev ? '0 ACU' : `${appRdsScalingMin} ACU`,
    max: $dev ? '1 ACU' : `${appRdsScalingMax} ACU`,
    pauseAfter: $dev ? '60 minute' : undefined, // Enable auto pause in dev
  },
});

new sst.x.DevCommand('DrizzleStudio', {
  link: [database],
  environment: {
    DATABASE_NAME: database.database,
    DATABASE_SECRET_ARN: database.secretArn,
    DATABASE_RESOURCE_ARN: database.clusterArn,
  },
  dev: {
    command: 'npx drizzle-kit studio',
    autostart: true,
  },
});

new sst.x.DevCommand('DrizzleGenerate', {
  link: [database],
  environment: {
    DATABASE_NAME: database.database,
    DATABASE_SECRET_ARN: database.secretArn,
    DATABASE_RESOURCE_ARN: database.clusterArn,
  },
  dev: {
    command: 'npx drizzle-kit generate',
    autostart: false,
  },
});

new sst.x.DevCommand('DrizzleMigrate', {
  link: [database],
  environment: {
    DATABASE_NAME: database.database,
    DATABASE_SECRET_ARN: database.secretArn,
    DATABASE_RESOURCE_ARN: database.clusterArn,
  },
  dev: {
    command: 'npx drizzle-kit migrate',
    autostart: false,
  },
});

export const POSTGRES_URL = $interpolate`postgresql://${database.username}:${database.password}@${database.host}:${database.port}/${database.database}`;

// Drizzle ORM push command
// This command is used to push schema changes to the database
// MUST use direct database connection. See GH issue for details:
// https://github.com/drizzle-team/drizzle-orm/issues/2982
$resolve([database]).apply(async ([database]) => {
  const POSTGRES_URL = $interpolate`postgresql://${database.username}:${database.password}@${database.host}:${database.port}/${database.database}?sslmode=require`;
  new sst.x.DevCommand('DrizzlePush', {
    link: [database],
    environment: {
      POSTGRES_URL: POSTGRES_URL,
    },
    dev: {
      command: $interpolate`npx drizzle-kit push --dialect=postgresql --schema=./lib/db/schema.ts --url=${POSTGRES_URL}`,
      autostart: false,
    },
  });
});

// Redis
export const redis = new sst.aws.Redis('CaddieRedis', { vpc: vpc });
export const redisUrl = $interpolate`rediss://${redis.username}:${redis.password?.apply((p) => encodeURIComponent(p))}@${redis.host}:${redis.port}`;
