import { neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { createDatabasePool } from "./config";

neonConfig.webSocketConstructor = ws;

export const pool = createDatabasePool();
export const db = drizzle({ client: pool, schema });