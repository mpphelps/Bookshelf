# Prisma + Expand/Contract Cheat Sheet

## The mental model

Prisma is three things, and conflating them causes pain:

1. **`schema.prisma`** — the canonical description of your data model. Source of truth for both the database AND the generated TypeScript types.
2. **The migrations folder** — a sequence of SQL files. Each one is "what to do to get from the previous state to a slightly newer state." Append-only history.
3. **The generated client** — TypeScript code derived from the schema, regenerated on demand. Lives in `packages/database/src/generated/prisma/`. **Not checked into git.**

Every time you change the schema, those three drift out of sync until you reconcile them.

---

## The four CLI commands you actually use

### `prisma migrate dev` — local development workflow
```bash
npx prisma migrate dev                          # apply all pending migrations + regenerate client
npx prisma migrate dev --name add_book_genre    # also create a new migration from current schema diff
npx prisma migrate dev --create-only --name xyz # CREATE the migration but DON'T apply it
```

Always use `--create-only` for anything non-trivial. Read the generated SQL before you let Prisma touch your DB. The "approval gate" is the most important habit you can build.

### `prisma migrate deploy` — production workflow
```bash
npx prisma migrate deploy
```

Applies all pending migrations. Does NOT regenerate the client (that's a build-time concern). Does NOT prompt you. Idempotent — already-applied migrations are skipped. This is what `docker-entrypoint.sh` runs on container start.

### `prisma generate` — sync client to schema
```bash
npx prisma generate
```

Regenerates the TypeScript client from the current `schema.prisma`. Run this whenever:
- You pull changes that modify the schema
- You switch branches
- `migrate dev` somehow didn't run it (rare but happens)
- TypeScript says a field "doesn't exist" but you can see it in the schema → stale client

### `prisma studio` — visual DB browser
```bash
npx prisma studio
```

Opens a localhost UI to browse/edit data. Useful for inspecting state during exercises. Not a substitute for `psql` when you need real SQL.

---

## Quick mental model: `--create-only` vs `dev` vs `deploy`

| Command | Generates SQL? | Applies SQL? | Regenerates client? | Where you use it |
|---|---|---|---|---|
| `migrate dev --create-only` | ✅ | ❌ | ❌ | When you want to review SQL first |
| `migrate dev` | ✅ if needed | ✅ | ✅ | Day-to-day dev loop |
| `migrate deploy` | ❌ | ✅ | ❌ | CI, prod entrypoint |
| `generate` | ❌ | ❌ | ✅ | After pulls, branch switches |

---

## `schema.prisma` syntax

### Field modifiers
```prisma
id        String   @id @default(cuid())  // @id = primary key; @default sets DB default
email     String   @unique                // @unique = unique index
name      String                          // non-null, no default
genre     String?                         // ? = nullable
authors   String[]                        // [] = Postgres array (nullable at DB level despite Prisma's API)
isFavorite Boolean @default(false)        // @default with a literal → metadata-only on PG 11+
shelf     Shelf   @default(WANT_TO_READ) // Enum + default
createdAt DateTime @default(now())        // now() = function default
updatedAt DateTime @updatedAt             // auto-updates on every write
```

### Relations
```prisma
model Book {
  userId String
  user   User   @relation(fields: [userId], references: [id])
  notes  Note[]
}

model Note {
  bookId String
  book   Book   @relation(fields: [bookId], references: [id], onDelete: Cascade)
}
```
`onDelete: Cascade` = parent delete removes children. Other options: `Restrict` (block), `SetNull` (nullify FK), `NoAction` (defer).

### Enums
```prisma
enum Shelf {
  WANT_TO_READ
  READING
  FINISHED
}
```

---

## The post-pull / branch-switch ritual

Build this into your fingers. Every time you `git pull` or `git checkout` something that touches the schema:

```bash
npm install                                  # if package.json changed
cd packages/database && npx prisma generate  # regenerate client
cd ../.. && (restart your dev server)        # client is in node_modules, in-memory copy is stale
```

The dev server holds the Prisma client in Node's module cache. HMR won't refresh it. Skip the restart and you get bizarre "column does not exist" errors that have nothing to do with your code.

---

## Inspecting the DB

### Via `docker exec`
```bash
docker exec -it bookshelf-db-1 psql -U bookshelf -d bookshelf
# → opens an interactive psql session inside the container
```

```bash
docker exec -it bookshelf-db-1 psql -U bookshelf -d bookshelf -c '\d "Book"'
# -c = run one command and exit. \d shows table structure.
```

### Inside psql (the `\` commands)
```sql
\dt                  -- list tables
\d "Book"            -- describe Book table (columns, types, constraints, indexes)
\d+ "Book"           -- + adds storage info, descriptions
\l                   -- list databases
\du                  -- list users/roles
\q                   -- quit
```

### Useful queries on Prisma metadata
```sql
-- What migrations has Prisma applied?
SELECT migration_name, finished_at
FROM _prisma_migrations
ORDER BY finished_at;

-- Did the last migration finish or did it fail mid-run?
SELECT migration_name, finished_at, logs, rolled_back_at
FROM _prisma_migrations
ORDER BY started_at DESC
LIMIT 5;
```

---

## The Expand/Contract pattern

### When you need it

Any change that **isn't purely additive and nullable**. Examples:

- Renaming a column
- Splitting one column into two
- Merging two columns into one
- Adding `NOT NULL` to a populated column
- Changing a column's type
- Dropping a column that code still references

The rule: **schema and code must never both change in the same deploy window for the same field.** If they do, there will be a moment when one container's code is incompatible with the schema another container just applied.

### The four phases

```
┌──────────┐  add the new shape; keep the old one fully working
│  EXPAND  │  Schema: +new column (nullable, default-friendly)
│          │  Code:   writes go to BOTH, reads still use OLD
└──────────┘
     │
     ▼
┌──────────┐  populate the new column for historical rows
│ BACKFILL │  Schema: (unchanged)
│          │  Code:   (unchanged)
│          │  Data:   UPDATE … SET new = derived(old) WHERE new IS NULL
└──────────┘
     │
     ▼
┌──────────┐  new column becomes authoritative
│   FLIP   │  Schema: new column NOT NULL, add CHECKs
│          │  Code:   reads switch to NEW; writes still dual
└──────────┘
     │
     ▼
┌──────────┐  stop maintaining the old column, then drop it
│ CONTRACT │  Phase 1: code stops writing OLD; schema makes OLD nullable
│          │  Phase 2: schema drops OLD entirely
└──────────┘
```

### Why it's two PRs at the contract end

You cannot stop writing to a `NOT NULL` column (inserts fail). You cannot drop a column the old container is still writing to. So:

- **Contract step 1**: relax `NOT NULL` + stop writing. Schema is now permissive enough for old container's writes AND new container's omissions.
- **Contract step 2**: drop the column. Safe because nothing writes it anymore.

### Revertability at each checkpoint

| After this phase ships | Want to revert? | What you do |
|---|---|---|
| Expand | `git revert` the PR | New column sits unused; harmless |
| Backfill | `git revert` | Data was just written; harmless dead data |
| Flip | `git revert` | Reads go back to old column (still populated via dual-write) |
| Contract step 1 | `git revert` | Dual-write resumes; new rows get backfilled in a follow-up |
| Contract step 2 | **Write a new restoration migration** | Old column is gone; recover from `new column` via UPDATE |

This is why dual-write is so valuable: the data lives in two places long enough to survive any decision reversal.

---

## SQL idioms for data transforms

### `split_part` — get the Nth piece of a delimited string
```sql
split_part('Frank Herbert', ' ', 1)    -- 'Frank'
split_part('Frank Herbert', ' ', 2)    -- 'Herbert'
split_part('Cher', ' ', 2)             -- ''  (empty string, not NULL)
```

### `position` — find the first occurrence (1-based)
```sql
position(' ' IN 'Frank Herbert')       -- 6 (1-based — humans count from 1)
position(' ' IN 'Cher')                -- 0 (not found returns 0, not -1)
```

### `substring` — extract a range
```sql
substring('Frank Herbert' FROM 1 FOR 5)    -- 'Frank' (start position 1, length 5)
substring('Frank Herbert' FROM 7)          -- 'Herbert' (from position 7 to end)
substring('  Mary  ' FROM 1)               -- '  Mary  ' (no implicit trim)
```

**Watch out for offsets:** SQL is 1-based and uses `FROM start FOR length`. JavaScript is 0-based and uses `start, end-exclusive`. Same intent, different math.

### `trim`, `ltrim`, `rtrim`
```sql
trim('  hello  ')          -- 'hello'
ltrim('  hello')           -- 'hello'
rtrim('hello  ')           -- 'hello'
```

### `NULLIF` — turn a sentinel value into NULL
```sql
NULLIF('', '')             -- NULL (matches → NULL)
NULLIF('something', '')    -- 'something'
```

Useful for "empty string after trim → NULL" conversions.

### `CASE` — branching
```sql
SELECT
  CASE
    WHEN length(name) = 0 THEN 'empty'
    WHEN length(name) < 5 THEN 'short'
    ELSE 'long'
  END
FROM "User";
```

### `cardinality` — array length
```sql
cardinality(authors)           -- 0 for empty, NULL for NULL
cardinality(authors) >= 1      -- common CHECK constraint pattern
```

### Array literals
```sql
ARRAY[author]                  -- single-element array from column value
ARRAY['x', 'y']                -- two-element literal
ARRAY[]::text[]                -- empty text array (need the cast)
```

---

## Migration SQL idioms

### The metadata-only ALTER (PG 11+)
```sql
ALTER TABLE foo ADD COLUMN bar TEXT;                            -- nullable, no default → metadata-only, instant
ALTER TABLE foo ADD COLUMN bar INT NOT NULL DEFAULT 0;          -- constant default → metadata-only on PG 11+
ALTER TABLE foo ADD COLUMN bar UUID NOT NULL DEFAULT gen_random_uuid();  -- VOLATILE default → full table rewrite!
```

The first two are instant on any size. The third one rewrites every row during the ALTER. Lethal on big tables.

### The "lock the column down" sequence
```sql
-- ❌ Naive: takes ACCESS EXCLUSIVE for the entire validation scan
ALTER TABLE foo ALTER COLUMN bar SET NOT NULL;

-- ✅ Safe on large tables:
ALTER TABLE foo ADD CONSTRAINT bar_not_null
  CHECK (bar IS NOT NULL) NOT VALID;       -- instant, no scan
ALTER TABLE foo VALIDATE CONSTRAINT bar_not_null;  -- SHARE UPDATE EXCLUSIVE; writes proceed
ALTER TABLE foo ALTER COLUMN bar SET NOT NULL;     -- PG 12+ uses the validated CHECK; no rescan
```

### The DROP COLUMN
```sql
ALTER TABLE foo DROP COLUMN bar;
```

Catalog-only, instant. The data is physically gone — **no recovery without a backup or a parallel column**.

### Adding a CHECK constraint
```sql
-- Strict (scans the table, blocks writes during scan):
ALTER TABLE foo ADD CONSTRAINT bar_positive CHECK (bar > 0);

-- Safe on large tables (no scan, no exclusive lock):
ALTER TABLE foo ADD CONSTRAINT bar_positive CHECK (bar > 0) NOT VALID;
ALTER TABLE foo VALIDATE CONSTRAINT bar_positive;
```

---

## Data-only migrations (the Prisma pattern)

Prisma's `migrate dev --create-only --name xyz` will create an **empty** migration.sql when there's no schema diff. Use this for backfills:

```bash
npx prisma migrate dev --create-only --name backfill_user_first_last_name
```

Then edit the empty file to add an UPDATE. Make it **idempotent**:

```sql
-- Idempotent: WHERE filter means re-running is a no-op once every row is populated
UPDATE "User"
SET "firstName" = split_part("name", ' ', 1)
WHERE "firstName" IS NULL;
```

Idempotency matters because the migration may replay against fresh environments (CI ephemeral DB, staging rebuilds, DR restores).

---

## Common gotchas

### "Column does not exist" at runtime, after a successful migration
Cause: dev server is holding the stale Prisma client in memory.
Fix: Ctrl+C the dev server, `npx prisma generate`, restart.

### "Property `xxx` does not exist on type `User`" but it IS in the schema
Cause: generated client wasn't regenerated since the schema change.
Fix: `cd packages/database && npx prisma generate`. Restart your IDE's TS server if it still shows red.

### CI passes, local fails
Cause: CI runs `npm run generate` before build (your `ci.yml` does this). Your laptop didn't.
Fix: `npx prisma generate` locally.

### Migration claims "0 rows affected" on prod
Possible cause: WHERE clause filtered out all rows; the migration was idempotent and already applied via dual-write; or the column has unexpected NULL semantics (e.g. empty array `'{}'` vs `NULL`).
Diagnosis: query the rows that DIDN'T match the WHERE to understand the state.

### `prisma migrate dev` fails with "Drift detected"
Cause: someone applied a change directly to the DB without going through migrations (or, on prod, a backup was restored to an older snapshot than the latest migration).
Fix: `prisma migrate resolve --applied <migration-name>` to mark it as applied, or `--rolled-back` to mark as not applied. Then sync schema with reality.

### NOT NULL constraint won't add — "existing NULL values found"
Cause: tried to lock the column down before backfilling.
Fix: run the backfill first; THEN add NOT NULL.

---

## A real-world expand/contract sequence (M3: rename `author` → `authors[]`)

The full sequence Bookshelf went through:

```
┌──────────────────────────────────────────────────────────────────────┐
│ M3a: EXPAND                                                          │
│  schema:  + authors String[]                                         │
│  SQL:     ALTER TABLE "Book" ADD COLUMN "authors" TEXT[];            │
│  code:    bookRepository.create writes BOTH author and authors[]     │
│  reads:   still book.author                                          │
└──────────────────────────────────────────────────────────────────────┘
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ M3b: BACKFILL                                                        │
│  schema:  (unchanged)                                                │
│  SQL:     UPDATE "Book" SET "authors" = ARRAY["author"]              │
│           WHERE "authors" IS NULL OR cardinality("authors") = 0;     │
│  code:    (unchanged)                                                │
└──────────────────────────────────────────────────────────────────────┘
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ M3c: FLIP                                                            │
│  SQL:     ALTER TABLE "Book" ALTER COLUMN "authors" SET NOT NULL;    │
│           ALTER TABLE "Book" ADD CONSTRAINT "book_authors_nonempty"  │
│             CHECK (cardinality("authors") >= 1);                     │
│  code:    UI reads book.authors.join(", "); writes still dual        │
└──────────────────────────────────────────────────────────────────────┘
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ M3d-1: CONTRACT step 1 — stop dual-writing, relax old column         │
│  schema:  author String?    (was: String)                            │
│  SQL:     ALTER TABLE "Book" ALTER COLUMN "author" DROP NOT NULL;    │
│  code:    bookRepository.create no longer passes `author`            │
└──────────────────────────────────────────────────────────────────────┘
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│ M3d-2: CONTRACT step 2 — drop the column                             │
│  schema:  (remove `author` field entirely)                           │
│  SQL:     ALTER TABLE "Book" DROP COLUMN "author";                   │
│  code:    (unchanged from M3d-1)                                     │
└──────────────────────────────────────────────────────────────────────┘
```

Five PRs, five separate CD deploys. Each one independently revertable. Zero user-visible downtime at any moment.

---

## When you DON'T need expand/contract

Some changes are safe in a single deploy:

- Adding a **nullable column with no default** — purely additive, no existing-row impact
- Adding a **constant-default NOT NULL column** on PG 11+ — metadata-only, no row rewrite
- Adding an **index** with `CREATE INDEX CONCURRENTLY` (note: Prisma's default `CREATE INDEX` is *not* concurrent — you have to edit the generated SQL if you want concurrent on a big table)
- Adding a **new table** that nothing references yet

The rule of thumb: if the change is purely additive at the schema level AND the code change is purely additive at the application level (no existing call sites change semantics), one PR is fine.

---

## Quick reference — which command for which job

| Task | Command |
|---|---|
| Edit schema, want to see SQL before applying | `npx prisma migrate dev --create-only --name xyz` |
| Edit schema, just apply it | `npx prisma migrate dev` |
| Pull from main, sync client | `npx prisma generate` (then restart dev server) |
| Add a data-only backfill | `npx prisma migrate dev --create-only --name backfill_x` → edit the empty SQL |
| Inspect a table | `docker exec -it bookshelf-db-1 psql -U bookshelf -d bookshelf -c '\d "Foo"'` |
| Browse data visually | `npx prisma studio` |
| Check which migrations are applied | `SELECT migration_name, finished_at FROM _prisma_migrations;` |
| Manually mark a migration as applied (drift recovery) | `npx prisma migrate resolve --applied <name>` |
| Find why a migration won't apply | Read `migration_lock.toml`, check `_prisma_migrations` for partial state |
