import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Database configuration - prioritize Supabase if available
let connectionString: string;
let supabaseUrl: string | undefined;
let supabaseKey: string | undefined;

// Force Supabase connection if credentials are available
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_DB_PASSWORD) {
  // Use Supabase - override any existing DATABASE_URL
  supabaseUrl = process.env.SUPABASE_URL;
  supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  // Convert Supabase API URL to PostgreSQL connection string
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!projectRef) {
    throw new Error("Invalid SUPABASE_URL format");
  }
  
  // Use Supabase's PostgreSQL connection format with direct connection
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  connectionString = `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`;
  console.log(`Forcing Supabase PostgreSQL connection for project: ${projectRef}`);
  console.log(`Connection string: postgresql://postgres:***@db.${projectRef}.supabase.co:5432/postgres`);
} else if (process.env.DATABASE_URL) {
  // Fallback to existing DATABASE_URL
  connectionString = process.env.DATABASE_URL;
  console.log("Using DATABASE_URL connection (fallback)");
} else {
  throw new Error("No database connection configured. Set SUPABASE_URL + SUPABASE_ANON_KEY + SUPABASE_DB_PASSWORD or DATABASE_URL");
}

// Create Supabase client for additional features if available
export const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Create PostgreSQL connection for Drizzle
const client = postgres(connectionString, { 
  max: 1,
  ssl: { rejectUnauthorized: false }
});

export const db = drizzle(client, { schema });