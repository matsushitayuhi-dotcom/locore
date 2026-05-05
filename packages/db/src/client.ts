import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/** 起動時に1回だけ作る Drizzle クライアント */
export const createDbClient = (databaseUrl: string) => {
  const client = postgres(databaseUrl, {
    prepare: false,
    max: 10,
  });
  return drizzle(client, { schema });
};

export type DbClient = ReturnType<typeof createDbClient>;

export { schema };
