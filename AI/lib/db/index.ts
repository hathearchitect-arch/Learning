import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import * as fs from 'node:fs';
import * as path from 'node:path';

const certificate = fs
  .readFileSync(path.resolve(process.cwd(), 'lib/db/global-bundle.pem'))
  .toString();

export const db = drizzle({
  connection: {
    connectionString: process.env.POSTGRES_URL as string,
    ssl: { ca: certificate },
  },
  schema: schema,
});
