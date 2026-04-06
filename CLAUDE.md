# BookShelf — CLAUDE.md

## Project Overview
Personal book tracker app. Users manage books across three shelves (Want to Read, Reading, Finished), leave notes, and rate finished books. Built as a learning project for React Router v7, Prisma v7, Turborepo, Vitest, and Playwright.

## Tech Stack
- **Framework:** React Router v7 (formerly Remix) with React 19, TypeScript, Vite
- **Styling:** Tailwind CSS v4
- **ORM:** Prisma v7 with PostgreSQL 17 (Docker)
- **Monorepo:** Turborepo with npm workspaces
- **Testing:** Vitest (unit/integration), Playwright (e2e)

## Monorepo Structure
- `apps/web` — React Router app (frontend + server routes)
- `packages/database` — Prisma schema, migrations, and client singleton
- `packages/eslint-config` — Shared ESLint configs
- `packages/typescript-config` — Shared TS configs

## Backend Architecture (Strict)
All features must follow three layers:
1. **Route layer** (`app/routes/`) — Thin. Parse request/form data, call a service, return response. No business logic. No Prisma calls.
2. **Service layer** (`app/services/`) — Business logic, validation, orchestration. Receives plain data, calls repositories, throws domain errors.
3. **Repository layer** (`app/repositories/`) — Prisma queries only. One per entity. No business logic. Returns Prisma types or null.

## Key Commands
```bash
# Root
npm run dev              # Start all apps via Turbo
npm run build            # Build all apps/packages

# Docker
docker compose up -d     # Start Postgres
docker compose down      # Stop Postgres

# Database (from packages/database)
npx prisma migrate dev --name <name>   # Create + apply migration
npx prisma migrate deploy              # Apply pending migrations (prod)
npx prisma generate                    # Regenerate client from schema
npx prisma migrate dev --create-only   # Generate SQL without applying (for review)
```

## Environment
- Single `.env` in `packages/database/` — contains `DATABASE_URL`
- `apps/web/vite.config.ts` has `envDir` pointing to `../../packages/database`
- Database: `postgresql://bookshelf:bookshelf@localhost:5432/bookshelf`

## Data Model
- **User** — id, email (unique), name, timestamps, has many Books
- **Book** — id, title, author, shelf (enum), rating (nullable), belongs to User, has many Notes
- **Note** — id, content, belongs to Book
- **Shelf enum** — WANT_TO_READ, READING, FINISHED

## Migration Policy
- Always inspect generated SQL before applying (`--create-only`)
- Consider impact on existing data before running migrations
- Use expand/contract pattern for structural changes
- Backfill data in migration SQL when adding required columns

## Authentication & Authorization
- **Auth provider:** Auth0 (OAuth 2.0 Authorization Code flow with PKCE)
- **Session:** JWT stored in encrypted HTTP-only session cookie (server-side)
- **JWT validation:** Signature verified against Auth0 JWKS on each request
- **Permissions:** Embedded in JWT claims, checked in the service layer
- **Roles:** `admin` (full access), `user` (read/write own data)
- **User sync:** On first login, Auth0 profile is used to create a local User record

## Testing
- **E2E (Playwright):** `apps/web/e2e/` folder, runs against `bookshelf_test` database
- **Unit (Vitest):** `apps/web/tests/unit/`, mocks repository layer
- **Integration (Vitest):** `apps/web/tests/integration/`, uses real test database
- Test database is separate from dev — configured via `.env.test`

## Agents
- **e2e-test-runner** — Use this agent for all Playwright work: creating tests, running tests, debugging failures. Spawn it via the Agent tool whenever e2e testing is needed.

## Conventions
- Route files use React Router v7 typed conventions (`Route.LoaderArgs`, `Route.ComponentProps`)
- Database package imported as `@bookshelf/database`
- Prisma client uses `@prisma/adapter-pg` driver adapter (required in Prisma v7)
- Authorization checks live in the service layer, never in routes or repositories
