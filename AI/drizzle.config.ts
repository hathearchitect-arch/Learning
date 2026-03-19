import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  driver: 'aws-data-api',
  dbCredentials: {
    database: process.env.DATABASE_NAME as string,
    secretArn: process.env.DATABASE_SECRET_ARN as string,
    resourceArn: process.env.DATABASE_RESOURCE_ARN as string,
  },
});
