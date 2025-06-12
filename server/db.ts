import { databasePool } from './utils/database-pool';

export const pool = databasePool.getPool();
export const db = databasePool.getDatabase();
export const supabase = databasePool.getSupabaseClient();