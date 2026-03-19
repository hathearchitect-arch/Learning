import * as schema from '@/lib/db/schema';
import { drizzle as drizzleAwsDataAPI } from 'drizzle-orm/aws-data-api/pg';

export const dbAwsDataApi = drizzleAwsDataAPI({
  connection: {
    database: process.env.DATABASE_NAME as string,
    secretArn: process.env.DATABASE_SECRET_ARN as string,
    resourceArn: process.env.DATABASE_RESOURCE_ARN as string,
  },
  schema: schema,
});
