import { neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { databasePool } from './utils/database-pool';

neonConfig.webSocketConstructor = ws;

export const pool = databasePool.getPool();
export const db = drizzle({ client: pool, schema });