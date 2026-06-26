import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// Disables prepared statements to stop the Supabase PgBouncer crashes
const client = postgres(connectionString, {
  prepare: false, 
  ssl: 'require', 
  max: 10,        
});

const pgAdapter = {
  query: (text: string, params?: any[]) => {
    const sanitizedParams = params?.map((p) =>
      typeof p === 'object' && p !== null && !Array.isArray(p) ? JSON.stringify(p) : p,
    );
    return client.unsafe(text, sanitizedParams);
  },
};

export const db = drizzle(client, { schema });

// --- THE FIX ---
// 1. Re-export all tables so the repositories can find them
export * from './schema'; 

// 2. Export the client as 'pool' to satisfy app.ts
export const pool = client;
export const sessionPool = pgAdapter;
