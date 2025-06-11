import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Database configuration - prioritize Supabase if available
let connectionString: string;
let supabaseUrl: string | undefined;
let supabaseKey: string | undefined;

if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  // Use Supabase
  supabaseUrl = process.env.SUPABASE_URL;
  supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  // Convert Supabase API URL to PostgreSQL connection string
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!projectRef) {
    throw new Error("Invalid SUPABASE_URL format");
  }
  
  // Use Supabase's PostgreSQL connection format
  // Note: You'll need to provide the actual database password from your Supabase project settings
  const dbPassword = process.env.SUPABASE_DB_PASSWORD || 'your-database-password';
  connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;
  console.log("Using Supabase PostgreSQL connection");
} else if (process.env.DATABASE_URL) {
  // Fallback to existing DATABASE_URL
  connectionString = process.env.DATABASE_URL;
  console.log("Using DATABASE_URL connection");
} else {
  throw new Error("No database connection configured. Set either SUPABASE_URL + SUPABASE_ANON_KEY or DATABASE_URL");
}

// Create Supabase client for additional features if available
export const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Create PostgreSQL connection for Drizzle
const client = postgres(connectionString, { 
  max: 1,
  ssl: true
});

export const db = drizzle(client, { schema });