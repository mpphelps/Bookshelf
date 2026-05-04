# BookShelf — Project Specification

A personal book tracking app built to learn Remix, Prisma, Turborepo, Vitest, and Playwright.

---

## 1. Overview

**BookShelf** lets users track books across three shelves: **Want to Read**, **Reading**, and **Finished**. Users can add books, move them between shelves, leave notes, and rate finished books.

---

## 2. Monorepo Structure (Turborepo)

```
bookshelf/
├── apps/
│   └── web/                      ← Remix app (React + TypeScript)
│       ├── app/
│       │   ├── routes/           ← Remix route files (thin layer)
│       │   ├── services/         ← Business logic layer
│       │   ├── repositories/     ← Data access layer (Prisma calls)
│       │   ├── components/       ← Shared React components
│       │   └── lib/              ← Utilities, types, helpers
│       ├── tests/
│       │   ├── unit/             ← Vitest unit tests (services, utils)
│       │   ├── integration/      ← Vitest integration tests (repos, loaders)
│       │   └── e2e/              ← Playwright end-to-end tests
│       └── vitest.config.ts
├── packages/
│   └── database/                 ← Shared Prisma package
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/       ← Migration history
│       ├── src/
│       │   └── client.ts         ← Prisma client singleton export
│       └── package.json
├── turbo.json
├── package.json
├── .gitignore
└── PROJECT_SPEC.md
```

---

## 3. Backend Architecture (Layered)

### 3a. Route Layer (Remix loaders & actions)
- **Responsibility:** Parse request params/form data, call the appropriate service, return Response/json.
- **Rules:**
  - No business logic.
  - No direct Prisma calls.
  - Handles HTTP-level concerns only (status codes, redirects, headers).

### 3b. Service Layer (`app/services/`)
- **Responsibility:** Business logic, validation, orchestration.
- **Rules:**
  - Receives plain data (not Request objects).
  - Calls one or more repositories.
  - Throws domain-specific errors (e.g., `BookNotFoundError`).
  - This is where rules like "you can only rate a book on the Finished shelf" live.

### 3c. Repository Layer (`app/repositories/`)
- **Responsibility:** Data access only — Prisma queries.
- **Rules:**
  - One repository per domain entity (BookRepository, NoteRepository, etc.).
  - No business logic or validation.
  - Returns Prisma types or `null`.
  - Never throws business errors — only data errors.

### Example flow for "Move a book to the Finished shelf":
```
Route action (parses formData: bookId, shelf)
  → bookService.moveToShelf(bookId, shelf)
    → validates shelf transition is allowed
    → bookRepository.updateShelf(bookId, shelf)
      → prisma.book.update(...)
```

---

## 4. Data Model (Prisma)

### Phase 1 — Initial Schema
```
User
  - id          String   @id @default(cuid())
  - email       String   @unique
  - name        String
  - createdAt   DateTime @default(now())
  - updatedAt   DateTime @updatedAt
  - books       Book[]

Book
  - id          String   @id @default(cuid())
  - title       String
  - author      String
  - shelf       Shelf    @default(WANT_TO_READ)
  - rating      Int?     (1-5, only when shelf = FINISHED)
  - userId      String
  - user        User     @relation(fields: [userId], references: [id])
  - createdAt   DateTime @default(now())
  - updatedAt   DateTime @updatedAt
  - notes       Note[]

Note
  - id          String   @id @default(cuid())
  - content     String
  - bookId      String
  - book        Book     @relation(fields: [bookId], references: [id])
  - createdAt   DateTime @default(now())
  - updatedAt   DateTime @updatedAt

enum Shelf {
  WANT_TO_READ
  READING
  FINISHED
}
```

### Phase 2 — Migration Exercises (introduced after Phase 1 is working)

Each exercise teaches a different migration skill:

| # | Change | Skill Learned |
|---|--------|---------------|
| M1 | Add `coverImageUrl` (optional) column to Book | Safe column addition — nullable columns don't break existing rows |
| M2 | Add `genre` column (required) with backfill | Adding a required column to a table with existing data — must provide a default or backfill |
| M3 | Split `author` string into a separate `Author` table with relation | Structural migration — create table, backfill from existing data, update references, drop old column (expand/contract pattern) |
| M4 | Add `startedAt` and `finishedAt` timestamps to Book, backfill from `updatedAt` | Data migration — writing a migration script that transforms existing data |
| M5 | Rename `content` to `body` on Note | Column rename — Prisma handles this as drop+create by default, learn to override with raw SQL rename |

**Teaching approach for each migration:**
1. Explain what the change is and why it's tricky
2. Show what Prisma generates by default (`prisma migrate dev --create-only`)
3. Inspect the generated SQL together
4. Discuss: "What happens to existing rows?"
5. Modify the migration SQL if needed (add backfills, defaults, etc.)
6. Apply the migration
7. Verify data integrity

---

## 5. Features & Routes

### Pages

| Route | Description | Remix Concepts |
|-------|-------------|----------------|
| `/` | Landing / redirect to `/shelves` | Root loader |
| `/auth/login` | Redirects to Auth0 login | OAuth 2.0 redirect |
| `/auth/callback` | Auth0 callback — validates tokens, creates session | OAuth callback, session cookies |
| `/auth/logout` | Clears session, redirects to Auth0 logout | Session destruction |
| `/shelves` | Dashboard showing all 3 shelves with book counts | Loader with DB query |
| `/shelves/$shelf` | Filtered view of one shelf | Dynamic route params, loader |
| `/books/new` | Add a book form | Action, form validation, redirect |
| `/books/$bookId` | Book detail — see notes, rating, change shelf | Nested loader, multiple actions |
| `/books/$bookId/notes` | Notes list for a book | Nested route, outlet |
| `/books/$bookId/notes/new` | Add a note | Action, form |

### Key Remix Concepts Covered
- Loaders (server-side data fetching)
- Actions (form mutations)
- Nested routing & Outlets
- Dynamic route params (`$bookId`, `$shelf`)
- Error boundaries & catch boundaries
- Session management (cookies)
- Form component & progressive enhancement
- useLoaderData, useActionData, useNavigation

---

## 6. Authentication & Authorization

### Authentication (Auth0 + OAuth 2.0)
- Auth0 handles login/signup UI, password storage, social login
- OAuth 2.0 Authorization Code flow with PKCE
- On successful login, Auth0 returns a JWT (id_token + access_token)
- Server stores the JWT in an encrypted HTTP-only session cookie
- Browser never sees the raw JWT — no XSS risk
- On first login, a User record is created in our DB (synced from Auth0 profile)

### Authorization (JWT-based)
- Each request: server reads JWT from session cookie, validates signature against Auth0 JWKS
- Permissions embedded in JWT claims (configured in Auth0 dashboard)
- Roles: `admin` (full access), `user` (read/write own data)
- Authorization checks happen in the service layer, not routes

### Auth Flow
```
Browser → /auth/login → redirect to Auth0
Auth0 → user logs in → redirect to /auth/callback
/auth/callback → validates code, exchanges for JWT, creates session cookie
Subsequent requests → loader reads cookie → validates JWT → extracts user + permissions
```

---

## 7. Testing Strategy

### Vitest — Unit Tests (`tests/unit/`)
- Service layer functions (business logic)
- Utility/helper functions
- Mock the repository layer using vi.mock

### Vitest — Integration Tests (`tests/integration/`)
- Repository functions against a real test database
- Loader/action functions with real DB
- Use a test database + migrate before suite, truncate between tests

### Playwright — E2E Tests (`e2e/`)
- Separate `e2e` folder at the `apps/web` level
- Runs against a dedicated `bookshelf_test` database (not dev or prod)
- Separate Docker service or same Postgres instance with a different DB name
- Migrations applied before test suite runs
- Database truncated between tests for isolation
- Full user flows in a real browser:
  - Sign in → Add a book → Move through shelves → Rate → Add notes
  - Error states (missing fields, invalid data)
- Auth0 testing: use Auth0 test credentials or bypass auth in test environment

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
- [x] Authorization middleware (role/permission checks) — `requirePermission()` in `services/auth.service.ts`
- [x] Test-only auth bypass — env-gated `/auth/test-login` route + `getAuthenticatedUser` bypass branch
- [x] Test DB infrastructure — `globalSetup` migrates, `cleanDb` fixture truncates per test, port 5174 isolated from dev

### Phase 2: Core CRUD Features
- [ ] Shelves dashboard page
- [ ] Add book form + action
- [ ] Book detail page with shelf management
- [ ] Notes CRUD on book detail
- [ ] Rating on finished books
- [ ] E2E tests for each feature as it's built
- All built with the 3-layer architecture (route → service → repo)

### Phase 3: Unit & Integration Testing
- [ ] Set up Vitest config
- [ ] Write unit tests for service layer
- [ ] Write integration tests for repositories

### Phase 4: Migration Exercises
- [ ] M1: Add optional column
- [ ] M2: Add required column with backfill
- [ ] M3: Extract entity to new table (expand/contract)
- [ ] M4: Data backfill migration
- [ ] M5: Column rename without data loss

### Phase 5: Polish & Advanced
- [ ] Error boundaries
- [ ] Optimistic UI with useNavigation
- [ ] Turbo pipeline configuration (build/test/lint)
- [ ] CI-ready scripts

---

## 9. Tech Versions

- Node.js: 24.7.0
- npm: 11.3.0
- Turborepo: 2.9.3
- React Router: 7.13.2
- Prisma: 7.6.0
- PostgreSQL: 17 (Docker)
- Auth0: jsonwebtoken ^9.0.3 + jwks-rsa ^4.0.1
- Vitest: TBD (Phase 3)
- Playwright: ^1.59.1
