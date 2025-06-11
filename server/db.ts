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
  
  // For Supabase, we'll use the existing DATABASE_URL which should be configured to point to Supabase
  // The SUPABASE_URL is for the REST API, DATABASE_URL is for direct PostgreSQL connection
  connectionString = process.env.DATABASE_URL!;
  console.log("Using Supabase database via DATABASE_URL");
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