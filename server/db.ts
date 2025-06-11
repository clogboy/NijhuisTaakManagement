import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from "@shared/schema";
import { createClient } from '@supabase/supabase-js';

let connectionString: string;
let supabaseUrl: string | undefined;
let supabaseKey: string | undefined;

// OVERRIDE: Always use Supabase if credentials are available
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_DATABASE_PASSWORD) {
  console.log("=== FORCING SUPABASE CONNECTION ===");
  
  supabaseUrl = process.env.SUPABASE_URL;
  supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  // Extract project reference from Supabase URL
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!projectRef) {
    throw new Error("Invalid SUPABASE_URL format");
  }
  
  // Use direct connection to Supabase database
  const dbPassword = process.env.SUPABASE_DATABASE_PASSWORD;
  connectionString = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;
  
  console.log(`Project: ${projectRef}`);
  console.log(`Direct Supabase connection: postgresql://postgres:***@db.${projectRef}.supabase.co:5432/postgres`);
  console.log("=== SUPABASE CONNECTION FORCED ===");
} else if (process.env.DATABASE_URL) {
  connectionString = process.env.DATABASE_URL;
  console.log("Using DATABASE_URL connection");
} else {
  throw new Error("No database connection configured");
}

// Create Supabase client
export const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Create PostgreSQL connection using postgres-js (not neon)
const client = postgres(connectionString, { 
  max: 1,
  ssl: 'require'
});

export const db = drizzle(client, { schema });