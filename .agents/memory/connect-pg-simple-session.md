---
name: connect-pg-simple session table
description: createTableIfMissing fails in dev mode; must create session table manually.
---

The `createTableIfMissing: true` option in `connect-pg-simple` tries to read a `table.sql` file relative to the package directory. In a pnpm monorepo dev server (tsx watch), the CWD is the artifact directory and the path resolves to `dist/table.sql` — which doesn't exist.

**Why:** The package computes the table.sql path relative to the running process CWD, not the package itself.

**How to apply:** Remove `createTableIfMissing` from the PgSession config. Instead, run this SQL once during setup (or in a migration):

```sql
CREATE TABLE IF NOT EXISTS session (
  sid varchar NOT NULL COLLATE "default",
  sess json NOT NULL,
  expire timestamp(6) NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE
);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
```
