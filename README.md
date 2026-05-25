# Bookshelf

A personal book tracker. Users sign in, add books to one of three shelves (Want to Read, Reading, Finished), leave notes, and rate finished books.

Built as a learning project for React Router v7, Prisma v7, Turborepo, Docker, and self-hosted deployment.

🌐 Live at **[readingbookshelf.com](https://readingbookshelf.com)** · 🗺️ Roadmap in [`PROJECT_SPEC.md`](./PROJECT_SPEC.md) · 🛠️ Ops in [`DEPLOYMENT.md`](./DEPLOYMENT.md)

## Stack

- **Framework:** React Router v7 (formerly Remix) + React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4
- **ORM:** Prisma v7 with PostgreSQL 17 (via `@prisma/adapter-pg` driver adapter)
- **Monorepo:** Turborepo with npm workspaces
- **Auth:** Auth0 (OAuth 2.0 Authorization Code + PKCE)
- **Testing:** Playwright (e2e)
- **Deployment:** Docker + Docker Compose, self-hosted on a Raspberry Pi 5 behind Cloudflare Tunnel

## Layout

```
apps/web/                       React Router app (routes, services, repos, components)
packages/database/              Prisma schema, migrations, prisma.config.ts, generated client
packages/ui/                    Shared React components (Button, Input, etc.)
packages/eslint-config/         Shared ESLint config
packages/typescript-config/     Shared tsconfig
Dockerfile                      Multi-stage build for the web app
docker-entrypoint.sh            Runs `prisma migrate deploy`, then starts the server
docker-compose.yml              Dev: Postgres only (dev + test DBs)
docker-compose.prod.yml         Prod: app + Postgres (project name `bookshelf-prod`)
scripts/backup.sh               Nightly Postgres backup script (see DEPLOYMENT.md)
```

The web app follows a strict three-layer backend pattern:

- **Routes** (`apps/web/app/routes/`) — thin: parse the request, call a service, return a response. No business logic.
- **Services** (`apps/web/app/services/`) — validation, ownership checks, orchestration. Throw domain errors.
- **Repositories** (`apps/web/app/repositories/`) — Prisma queries only. One per entity. No cross-entity joins.

See [`CLAUDE.md`](./CLAUDE.md) for full architectural conventions and [`PROJECT_SPEC.md`](./PROJECT_SPEC.md) for the phased roadmap.

## Getting started

### Prerequisites

- Node.js ≥ 20
- Docker Desktop
- An Auth0 tenant (free tier)

### Setup

```bash
# Install dependencies
npm install

# Start Postgres (dev + test DBs)
docker compose up -d

# Create packages/database/.env with these keys:
#   DATABASE_URL=postgresql://bookshelf:bookshelf@localhost:5432/bookshelf
#   SESSION_SECRET=<32+ char random string>
#   AUTH0_DOMAIN=<your-tenant>.auth0.com
#   AUTH0_CLIENT_ID=...
#   AUTH0_CLIENT_SECRET=...
#   AUTH0_AUDIENCE=...
#   AUTH0_CALLBACK_URL=http://localhost:5173/auth/callback

# Apply migrations
cd packages/database
npx prisma migrate deploy
cd ../..

# Run the app
npm run dev
```

App is at `http://localhost:5173`.

## Common commands

```bash
# Dev (from repo root)
npm run dev                              # Turbo: starts all apps
npm run build                            # Turbo: builds all apps + packages
docker compose up -d                     # Start Postgres
docker compose down                      # Stop Postgres

# Database (from packages/database)
npx prisma migrate dev --name <name>     # Create + apply migration
npx prisma migrate dev --create-only     # Generate SQL without applying (review first)
npx prisma migrate deploy                # Apply pending migrations (prod-style)
npx prisma generate                      # Regenerate client from schema

# E2E tests (from apps/web)
npm run test:e2e                         # Headless Playwright run
npm run test:e2e:headed                  # With browser UI
```

## Production stack (local test)

To build and run the full prod stack locally (app + dedicated Postgres):

```bash
docker compose -f docker-compose.prod.yml --env-file packages/database/.env up --build
```

The `--env-file` flag is required: `docker-compose.prod.yml` interpolates `${POSTGRES_USER}` / `${POSTGRES_PASSWORD}` / `${POSTGRES_DB}` and refuses to start if any are missing. Make sure those three keys are in your `.env`.

App is at `http://localhost:3000`. The container runs `prisma migrate deploy` on every start, so a fresh volume auto-applies all migrations.

The prod compose uses project name `bookshelf-prod` and its own `pgdata_prod` volume, so it will not collide with or overwrite your dev DB container/volume.

Auth note: session cookies are `Secure`-only in production. `http://localhost:3000` works (browsers grant localhost an HTTP exemption), but other LAN hosts over plain HTTP will drop the cookie and loop on the Auth0 callback. Real LAN/phone testing requires HTTPS (handled by Cloudflare Tunnel on the Pi).

## Deployment

Production runs on a Raspberry Pi 5 at home, exposed via Cloudflare Tunnel, deployed via GitHub Actions:

- Docker Compose runs the app + Postgres on the Pi
- Cloudflare Tunnel exposes the app publicly (free, auto-SSL, no port forwarding)
- A self-hosted GitHub Actions runner on the Pi handles deploys triggered by `workflow_run` after CI succeeds on `main`
- Hosted Ubuntu runners handle CI (lint, check-types, build, e2e); branch protection requires all four green before merge
- Production secrets live in GitHub Actions repository secrets — the CD workflow materializes `.env` on the Pi at deploy time; the file is never edited by hand
- Nightly `pg_dump` (3 AM local) → rclone crypt overlay → Backblaze B2; 7-day local + 30-day off-site retention; healthchecks.io alerts on miss; quarterly restore drill

Full step-by-step setup, troubleshooting, secret rotation, and disaster recovery runbooks live in **[`DEPLOYMENT.md`](./DEPLOYMENT.md)**.

## Data model

- **User** — id, email (unique), name, timestamps. Has many Books.
- **Book** — id, title, author, shelf, rating (nullable). Belongs to User. Has many Notes.
- **Note** — id, content, timestamps. Belongs to Book (cascade delete).
- **Shelf enum** — `WANT_TO_READ`, `READING`, `FINISHED`.

## License

Personal project. No license granted.
