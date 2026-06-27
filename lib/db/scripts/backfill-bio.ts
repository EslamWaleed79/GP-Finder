import { db, usersTable } from '../src/index.ts';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('🔄 Backfilling null bios...');
  await db.update(usersTable).set({ bio: 'No bio provided yet.' }).where(sql`${usersTable.bio} IS NULL`);
  console.log('✅ Done!');
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
