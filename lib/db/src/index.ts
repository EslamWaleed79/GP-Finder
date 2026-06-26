import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema'; // Keep your exact schema import path

// Grab the connection string from environment variables
const connectionString = process.env.DATABASE_URL!;

// Configuration designed explicitly to play nicely with Supabase's transaction pooler
const client = postgres(connectionString, {
  prepare: false, // CRITICAL: This stops the PgBouncer / prepared statements crash
  ssl: 'require', // Enforces secure SSL handshake cleanly
  max: 10,        // Keeps connection counts safe under the Nano tier limit
});

export const db = drizzle(client, { schema });
