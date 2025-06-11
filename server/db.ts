import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from "@shared/schema";
import { createClient } from '@supabase/supabase-js';

// Force Supabase connection by completely bypassing DATABASE_URL
let connectionString: string;
let supabaseUrl: string | undefined;
let supabaseKey: string | undefined;

console.log("=== INITIALIZING DATABASE CONNECTION ===");

// Always prioritize Supabase if credentials exist
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_DATABASE_PASSWORD) {
  console.log("Supabase credentials found - forcing Supabase connection");
  
  supabaseUrl = process.env.SUPABASE_URL;
  supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!projectRef) {
    throw new Error("Invalid SUPABASE_URL format");
  }
  
  const dbPassword = process.env.SUPABASE_DATABASE_PASSWORD;
  connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;
  
  // Override environment to force drizzle-kit to use Supabase
  process.env.DATABASE_URL = connectionString;
  
  console.log(`✓ Supabase project: ${projectRef}`);
  console.log(`✓ Connection: postgresql://postgres.${projectRef}:***@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`);
  console.log("✓ DATABASE_URL overridden with Supabase connection string");
} else {
  console.log("No Supabase credentials - using default DATABASE_URL");
  connectionString = process.env.DATABASE_URL!;
}

// Create Supabase client for additional features
export const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Create PostgreSQL connection using postgres-js
console.log("Creating postgres-js client...");
const client = postgres(connectionString, { 
  max: 1,
  ssl: 'require',
  transform: undefined
});

// Test connection immediately
client`SELECT current_database() as db, current_user as user`.then(result => {
  console.log(`✓ Connected to database: ${result[0].db} as ${result[0].user}`);
}).catch(err => {
  console.error(`✗ Database connection failed: ${err.message}`);
});

export const db = drizzle(client, { schema });
console.log("=== DATABASE CONNECTION INITIALIZED ===");