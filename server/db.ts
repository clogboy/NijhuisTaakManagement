import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || process.env.DATABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "SUPABASE_URL or DATABASE_URL must be set. Did you forget to configure Supabase?",
  );
}

// Create Supabase client for additional features if needed
export const supabase = supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// For Drizzle ORM, we use the direct PostgreSQL connection
let connectionString: string;

if (process.env.DATABASE_URL) {
  connectionString = process.env.DATABASE_URL;
} else if (supabaseUrl) {
  // Extract connection details from Supabase URL if needed
  connectionString = supabaseUrl;
} else {
  throw new Error("No database connection string found");
}

// Create PostgreSQL connection for Drizzle
const client = postgres(connectionString, { 
  max: 1,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export const db = drizzle(client, { schema });