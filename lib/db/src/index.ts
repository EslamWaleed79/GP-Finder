import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema'; // Ensure this points correctly to your schema file relative to src/

const connectionString = process.env.DATABASE_URL!;

// Disables prepared statements to permanently stop the Supabase PgBouncer socket drops
const client = postgres(connectionString, {
  prepare: false, 
  ssl: 'require', 
  max: 10,        
});

export const db = drizzle(client, { schema });
