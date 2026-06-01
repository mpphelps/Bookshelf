# BookShelf — Project Specification

A personal book tracking app built to learn React Router v7, Prisma v7, Turborepo, Playwright, Docker, and self-hosted production deployment (Raspberry Pi + Cloudflare Tunnel + GitHub Actions CI/CD).

🌐 Live: **[readingbookshelf.com](https://readingbookshelf.com)** · 🛠️ Ops runbook: [`DEPLOYMENT.md`](./DEPLOYMENT.md) · 🤖 Conventions: [`CLAUDE.md`](./CLAUDE.md)

---

## 1. Overview

**BookShelf** lets users track books across three shelves: **Want to Read**, **Reading**, and **Finished**. Users can add books, move them between shelves, leave notes, and rate finished books.

---

## 2. Monorepo Structure (Turborepo)

```
bookshelf/
├── apps/
│   └── web/                            ← React Router v7 app
│       ├── app/
│       │   ├── routes/                 ← Route files (thin layer)
│       │   ├── services/               ← Business logic layer
│       │   ├── repositories/           ← Data access layer (Prisma calls)
│       │   ├── components/             ← Layout primitives, book-specific UI
│       │   └── lib/                    ← Utilities, types, helpers
│       ├── e2e/                        ← Playwright end-to-end tests
│       │   ├── specs/
│       │   ├── test-fixtures.ts
│       │   └── global-setup.ts
│       └── playwright.config.ts
├── packages/
│   ├── database/                       ← Shared Prisma package
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/             ← Migration history
│   │   ├── src/client.ts               ← Prisma client singleton export
│   │   └── prisma.config.ts            ← Prisma v7 datasource URL config
│   ├── ui/                             ← Shared React components (Button, Input, etc. via CVA)
│   ├── eslint-config/                  ← Shared ESLint flat config
│   └── typescript-config/              ← Shared tsconfig.json bases
├── .github/workflows/
│   ├── ci.yml                          ← Lint, check-types, build, e2e on hosted Ubuntu
│   └── cd.yml                          ← Deploy to Pi via self-hosted runner
├── scripts/
│   └── backup.sh                       ← Nightly Postgres backup (deployed to Pi)
├── Dockerfile                          ← Multi-stage prod build
├── docker-entrypoint.sh                ← Runs prisma migrate deploy, then react-router-serve
├── docker-compose.yml                  ← Dev: Postgres only
├── docker-compose.prod.yml             ← Prod: app + Postgres (project: bookshelf-prod)
├── turbo.json
├── DEPLOYMENT.md                       ← Full deployment + ops runbook
├── CLAUDE.md                           ← Architectural conventions
└── PROJECT_SPEC.md                     ← This file
```

---

## 3. Backend Architecture (Layered)

### 3a. Route Layer (`app/routes/`)

- **Responsibility:** Parse request params/form data, call the appropriate service, return Response/json.
- **Rules:**
  - No business logic.
  - No direct Prisma calls.
  - Handles HTTP-level concerns only (status codes, redirects, headers).

### 3b. Service Layer (`app/services/`)

- **Responsibility:** Business logic, validation, orchestration, ownership/permission checks.
- **Rules:**
  - Receives plain data (not Request objects).
  - Calls one or more repositories.
  - Throws domain-specific errors (e.g., `BookNotFoundError`, `ForbiddenError`).
  - This is where rules like "you can only rate a book on the Finished shelf" live.
  - Cross-entity composition happens here (e.g., `getNoteForUser` composes `getBookForUser`).

### 3c. Repository Layer (`app/repositories/`)

- **Responsibility:** Data access only — Prisma queries.
- **Rules:**
  - One repository per domain entity (BookRepository, NoteRepository, etc.).
  - No business logic or validation.
  - Returns Prisma types or `null`.
  - Never throws business errors — only data errors.
  - **No cross-entity `include`s** — composition is the service layer's job.

### Example flow for "Move a book to the Finished shelf":

```
Route action (parses formData: bookId, shelf)
  → bookService.moveToShelf(user, bookId, shelf)
    → bookService.getBookForUser(user, bookId)  ← ownership gate
    → validates shelf transition
    → bookRepository.update(bookId, { shelf })
      → prisma.book.update(...)
```

---

## 4. Data Model (Prisma)

### Current schema

```
User
  - id          String   @id @default(cuid())
  - email       String   @unique
  - firstName   String                                 (CHECK length > 0)
  - lastName    String?
  - createdAt   DateTime @default(now())
  - updatedAt   DateTime @updatedAt
  - books       Book[]

Book
  - id          String   @id @default(cuid())
  - title       String
  - authors     String[]                               (CHECK cardinality >= 1)
  - genre       String?
  - isFavorite  Boolean  @default(false)
  - shelf       Shelf    @default(WANT_TO_READ)
  - rating      Int?     (1-5, only when shelf = FINISHED)
  - userId      String
  - user        User     @relation(fields: [userId], references: [id])
  - createdAt   DateTime @default(now())
  - updatedAt   DateTime @updatedAt
  - notes       Note[]   (onDelete: Cascade)

Note
  - id          String   @id @default(cuid())
  - content     String
  - bookId      String
  - book        Book     @relation(fields: [bookId], references: [id], onDelete: Cascade)
  - createdAt   DateTime @default(now())
  - updatedAt   DateTime @updatedAt

enum Shelf {
  WANT_TO_READ
  READING
  FINISHED
}
```

This schema is the **result** of Phase 4's migration exercises — see §8 for how it evolved from the initial shape (single `author String`, single `name String`, no `genre`/`isFavorite`) through expand/contract sequences.

---

## 5. Features & Routes

### Pages

| Route                               | Description                                                      | Notes                              |
| ----------------------------------- | ---------------------------------------------------------------- | ---------------------------------- |
| `/`                                 | Landing / redirect to `/shelves`                                 | Root loader                        |
| `/auth/login`                       | Redirects to Auth0 authorize URL                                 | OAuth 2.0 redirect                 |
| `/auth/callback`                    | Auth0 callback — validates code, creates session                 | OAuth callback                     |
| `/auth/logout`                      | Clears session, redirects to Auth0 logout                        | Session destruction                |
| `/auth/test-login`                  | Test-only bypass; gated by `E2E_AUTH_BYPASS=1`                   | E2E auth                           |
| `/health`                           | Shallow liveness probe (no DB query); used by Playwright + Pi CD | 200 OK + plain HTML                |
| `/shelves`                          | Dashboard — three shelf tiles with book counts                   | Loader with DB query               |
| `/shelves/$shelf`                   | Filtered view of one shelf                                       | Dynamic route params               |
| `/books/new`                        | Add a book (route modal)                                         | Action, form validation, redirect  |
| `/books/$bookId`                    | Book detail — notes inline, rating, shelf change, delete         | Multi-intent action (`intent=...`) |
| `/books/$bookId/notes/new`          | Add a note (route modal)                                         | Reuses `NoteFormModal`             |
| `/books/$bookId/notes/$noteId/edit` | Edit a note (route modal)                                        | Reuses `NoteFormModal`             |

### Key React Router v7 concepts covered

- Loaders (server-side data fetching) and Actions (form mutations)
- Typed routes via `Route.LoaderArgs` / `Route.ComponentProps`
- Nested routing & Outlets
- Dynamic route params (`$bookId`, `$shelf`)
- Modal-as-route pattern (Radix `Dialog` wrapped in `RouteModal`)
- Error boundaries
- Session management (encrypted HTTP-only cookies)
- Multi-intent actions via hidden `intent` field

---

## 6. Authentication & Authorization

### Authentication (Auth0 + OAuth 2.0)

- Auth0 handles login/signup UI, password storage, social login
- OAuth 2.0 Authorization Code flow with PKCE
- On successful login, Auth0 returns a JWT (id_token + access_token)
- Server stores the JWT in an encrypted HTTP-only session cookie — browser never sees the raw JWT (no XSS risk)
- On first login, a User record is created in our DB (synced from Auth0 profile)
- **Behind TLS-terminating proxy (Cloudflare Tunnel):** `redirect_uri` is sourced from `AUTH0_CALLBACK_URL` env var, never derived from `request.url` (which reports `http://` because cloudflared terminates TLS at the edge)

### Authorization (JWT-based)

- Each request: server reads JWT from session cookie, validates signature against Auth0 JWKS
- Permissions embedded in JWT claims (configured in Auth0 dashboard)
- Roles: `admin` (full access), `user` (read/write own data)
- Authorization checks happen in the service layer, not routes

### Auth flow

```
Browser → /auth/login → redirect to Auth0
Auth0 → user logs in → redirect to /auth/callback
/auth/callback → validates code, exchanges for JWT, creates session cookie
Subsequent requests → loader reads cookie → validates JWT → extracts user + permissions
```

### E2E auth bypass

- `E2E_AUTH_BYPASS=1` env var enables two test-only paths:
  - `/auth/test-login` accepts a POST and sets a test session cookie (404 in production)
  - `getAuthenticatedUser` short-circuits JWT validation and reads the test cookie instead
- Playwright `page` fixture POSTs to `/auth/test-login` before each test that declares `test.use({ user: ... })`
- Bypass is never enabled in production; gated by env var

---

## 7. Testing Strategy

### Playwright — E2E (`apps/web/e2e/`)

Primary test strategy. End-to-end coverage exercises routes, services, and repositories together — the entire stack.

- Runs against a dedicated `bookshelf_test` database, port 5174 isolated from dev
- `globalSetup` runs `prisma migrate deploy` before the suite
- `cleanDb` fixture truncates `User`, `Book`, `Note` between tests for isolation
- Suite-level auth via `test.use({ user: ... })` + `page` fixture override
- Webserver probe uses `/health` (no DB query) to avoid race against migrations
- CI runs the same suite against an ephemeral Postgres service container

### Vitest — deferred

Originally planned for service and repository unit/integration tests; E2E coverage proved sufficient. Will revisit if specific business logic grows complex enough to warrant isolated unit testing.

---

## 8. Build Phases (Learning Progression)

### Phase 1: Scaffold & Setup ✅

- [x] Initialize Turborepo monorepo
- [x] Create `packages/database` with Prisma + initial schema
- [x] Create `apps/web` React Router v7 app
- [x] Connect app to the shared database package
- [x] Run first migration
- [x] Verify: app starts, connects to DB (health check route)

### Phase 1b: Testing & Auth Setup ✅

- [x] Set up Playwright with dedicated test database
- [x] Set up Auth0 tenant and configure OAuth 2.0
- [x] Implement auth routes (login, callback, logout)
- [x] JWT session cookie middleware
- [x] User sync on first login (Auth0 → local DB)
- [x] Authorization middleware (role/permission checks) — `requirePermission()` in `services/auth.service.server.ts`
- [x] Test-only auth bypass — env-gated `/auth/test-login` route + `getAuthenticatedUser` bypass branch
- [x] Test DB infrastructure — `globalSetup` migrates, `cleanDb` fixture truncates per test, port 5174 isolated from dev

### Phase 2: Core CRUD Features ✅

- [x] Shelves dashboard page
- [x] Add book form + action
- [x] Book detail page with shelf management
- [x] Notes CRUD on book detail
- [x] Rating on finished books
- [x] E2E tests for each feature as it's built
- All built with the 3-layer architecture (route → service → repo)

### Phase 2b: CRUD Completion ✅

Round out update/delete patterns missed in initial Phase 2.

- [x] Delete book (cascade-deletes notes; migration `add_cascade_delete_notes` adds `onDelete: Cascade` on `Note.book`)
- [x] Edit note (modal sub-route `/books/:bookId/notes/:noteId/edit`)
- [x] Delete note (inline action on `LogEntry`)
- [x] E2E coverage including negative ownership tests for all three

Note service introduces `getNoteForUser` (Note → Book → User), which composes `getBookForUser` — single ownership gate reused by update + delete. Repos stay single-table.

### Phase 3: Unit & Integration Testing (deferred indefinitely)

E2E coverage from Phase 2 considered sufficient — service/repo layers are exercised end-to-end through the route layer. Revisit only if specific business logic grows complex enough to warrant isolated unit testing.

### Phase 3b: Production Deployment (Pi 5 self-host) ✅

Live public-facing environment on a home Raspberry Pi 5 so Phase 4 migration exercises also teach prod-migration practice. AWS rejected on cost — actual spend ~$1-2/mo (domain + electricity).

**Architecture:** Pi 5 (8GB) runs `docker compose` with `app` (RR7 + Prisma) + `postgres` (named volume). Cloudflare Tunnel exposes the app at `readingbookshelf.com`. Self-hosted GitHub Actions runner on the Pi handles deploy; hosted runners handle CI.

- [x] Register domain (Cloudflare Registrar) — `readingbookshelf.com`
- [x] Install Docker + Docker Compose on Pi
- [x] Verify local production build (`npm run build`)
- [x] Fix `turbo.json` build output globs (`build/**`)
- [x] Multi-stage Dockerfile for monorepo + `prisma generate` in build stage
- [x] Container entrypoint runs `prisma migrate deploy` before `react-router-serve`
- [x] `docker-compose.prod.yml` with `app` + `postgres` services + named `pgdata_prod` volume
- [x] Get stack running on Pi (manual `docker compose up`)
- [x] Cloudflare Tunnel: `cloudflared` installed + systemd-managed, tunnel `bookshelf` routes apex + www
- [x] Auth0 prod callback URLs added; app refactored to use `AUTH0_CALLBACK_URL` env var (not `request.url`)
- [x] Self-hosted GitHub Actions runner on Pi, systemd-managed
- [x] CI workflow (hosted runner): lint, check-types, build, e2e against Postgres service container
- [x] CD workflow (self-hosted runner): on workflow_run success → git reset, materialize `.env` from GH Secrets, docker compose up -d --build, curl `/health`
- [x] Branch protection on `main`: PR required, all 4 CI checks required, force-push blocked, squash-only merges
- [x] All prod secrets migrated to GitHub Actions repository secrets; `.env` materialized by CD on every deploy with `chmod 600`
- [x] Nightly `pg_dump -Fc` → rclone crypt overlay → Backblaze B2; 7-day local + 30-day off-site retention; healthchecks.io alerts on miss
- [x] Restore drill verified (throwaway Postgres + pg_restore + data-parity check)
- [x] Smoke test live app golden path (login → CRUD on book + note → logout)

Full step-by-step runbook in [`DEPLOYMENT.md`](./DEPLOYMENT.md).

### Phase 4: Migration Exercises ✅

Each migration flowed dev → CI → prod via the full pipeline, exercising the complete deploy cadence (including the nightly backup that captured pre/post state). The two expand/contract sequences (M3 and M4) were five PRs each, zero downtime, every checkpoint independently revertable.

- [x] **M1**: Add optional column — `Book.genre String?` (unlocks 6.2). Pure additive, nullable, no backfill. PR #10.
- [x] **M2**: Add required column with constant default — `Book.isFavorite Boolean @default(false)`. Metadata-only on PG 11+ (constant default = no table rewrite). PR #11.
- [x] **M3**: Rename `Book.author` → `Book.authors String[]` via expand/contract. Five PRs (#12–#16): expand → backfill → flip with `NOT NULL` + `CHECK (cardinality >= 1)` → stop dual-write + drop `NOT NULL` → `DROP COLUMN`.
- [x] **M4**: Split `User.name` → `firstName` + `lastName` via expand/contract. Five PRs. **New lesson:** SQL data transform in backfill (`split_part`, `position`, `substring`, `NULLIF`) matching JS `splitName()` exactly. **OIDC refactor:** `handleCallback` now verifies ID token for identity claims (`email`, `given_name`, `family_name`) and access token for permissions — the architecturally correct split. CHECK constraint `length("firstName") > 0` enforced at the DB.
- 🚫 **M5**: Dropped from plan. Standalone column-drop mechanics already covered by M3's and M4's contract phases; a separate exercise would have been a recap rather than new learning.

**Cheat sheet** captured at [`prismaCheatSheet.md`](./prismaCheatSheet.md) — covers Prisma CLI, schema syntax, expand/contract phases, SQL idioms for transforms, common gotchas (stale client, NOT NULL on populated columns, 1-based vs 0-based offset math).

**Per-migration teaching loop (used for every PR):**

1. Edit `schema.prisma`
2. `npx prisma migrate dev --create-only` — generates SQL without applying
3. Inspect the SQL: what gets locked? what happens to existing rows? what's the backfill order?
4. `npx prisma migrate dev` — applies to dev + regenerates client
5. Open PR; CI runs migration against ephemeral Postgres in the e2e job
6. Squash-merge; CD runs `migrate deploy` against prod via the Docker entrypoint
7. Nightly backup captures the new schema state

**Open follow-up (deferred):** Auth0 database-connection signups (email + password) don't collect `firstName`/`lastName` by default — current behavior falls back to `splitName(name)`, which puts the email address into `firstName` for users who never provided a name. Profile-edit flow (Phase 6.6) addresses this.

### Phase 5: Polish & Advanced (next)

- [ ] Error boundaries (root-level, not just per-route)
- [ ] Optimistic UI with `useNavigation` / `useFetcher` pending states
- [ ] SEO: meta tags, Open Graph, sitemap, robots.txt — app is public + search-discoverable
- [ ] Performance pass: bundle analysis, image optimization for book covers

### Phase 6: Feature Enhancements

- [ ] 6.1: Open Library API — search-first add-book modal (auto-fill title/author/cover from `openlibrary.org/search.json`); manual entry remains as fallback. Independent of Phase 4.
- [ ] 6.2: Sort books on a shelf — URL state `?sort=title|author|genre|recent`. Genre column now available (Phase 4 M1).
- [ ] 6.3: Drag-and-drop priority reordering within a shelf via `@dnd-kit/sortable`. Requires adding `Book.priority Int` via a future expand/contract migration — originally planned as Phase 4 M2 but M2 became `isFavorite` instead.
- [ ] 6.4: Add a friend; view your friend's shelves
- [ ] 6.5: Redis caching for friends' shelves
- [ ] 6.6: User Profile Edit — also lets email-signup users fill in `firstName`/`lastName` (currently email-as-firstName via `splitName` fallback; see Phase 4 follow-up note).

---

## 9. Tech Versions

- Node.js ≥ 20
- npm 11.3.0
- Turborepo 2.9.3
- React Router 7.13.2 + React 19.2.4 + TypeScript 5.9
- Vite 7
- Tailwind CSS 4.2
- Prisma 7.6 (with `@prisma/adapter-pg` driver adapter)
- PostgreSQL 17 (Docker, official image)
- Auth0: `jsonwebtoken` ^9.0.3 + `jwks-rsa` ^4.0.1
- Playwright ^1.59.1 (Chromium only)
- ESLint 9 (flat config) — shared via `@repo/eslint-config`
- Docker + Docker Compose v2 (Compose Spec)
- Cloudflare Tunnel (`cloudflared`)
- rclone (B2 backend + crypt overlay) — for off-site backups
