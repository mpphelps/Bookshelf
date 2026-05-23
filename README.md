# Bookshelf

A personal book tracker. Users sign in, add books to one of three shelves (Want to Read, Reading, Finished), leave notes, and rate finished books.

Built as a learning project for React Router v7, Prisma v7, Turborepo, Docker, and self-hosted deployment.

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
docker compose -f docker-compose.prod.yml up --build
```

App is at `http://localhost:3000`. The container runs `prisma migrate deploy` on every start, so a fresh volume auto-applies all migrations.

The prod compose uses project name `bookshelf-prod` and its own `pgdata_prod` volume, so it will not collide with or overwrite your dev DB container/volume.

Auth note: session cookies are `Secure`-only in production. `http://localhost:3000` works (browsers grant localhost an HTTP exemption), but other LAN hosts over plain HTTP will drop the cookie and loop on the Auth0 callback. Real LAN/phone testing requires HTTPS (handled by Cloudflare Tunnel on the Pi).

## Deployment

Production deploys to a Raspberry Pi 5 at home:

- Docker Compose runs the app + Postgres on the Pi
- Cloudflare Tunnel exposes the app publicly (free, auto-SSL, no port forwarding)
- A self-hosted GitHub Actions runner on the Pi handles deploys
- Hosted runners handle lint, build, and e2e in CI
- Nightly `pg_dump` to off-site storage (Backblaze B2)

See [`PROJECT_SPEC.md`](./PROJECT_SPEC.md) §3b for the full deployment plan.

### Cloudflare Tunnel setup (Raspberry Pi)

This walks the full setup from a fresh Pi 5 to a live `https://<your-domain>` URL backed by Cloudflare Tunnel. It assumes:

- Docker + Docker Compose are already installed on the Pi.
- The repo is cloned at `~/Bookshelf` and `docker compose -f docker-compose.prod.yml up -d` brings the stack up on `localhost:3000`.
- You own a domain that has its nameservers pointed at Cloudflare (registering through Cloudflare Registrar does this automatically).

#### 1. Install `cloudflared` from Cloudflare's Debian apt repo

Don't use the `cloudflared.repo` URL — that's RPM format and will fail on Debian/Raspberry Pi OS with `Malformed line` errors. Use the `signed-by` keyring pattern instead:

```bash
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null

echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" \
  | sudo tee /etc/apt/sources.list.d/cloudflared.list

sudo apt update
sudo apt install -y cloudflared
cloudflared --version
```

#### 2. Authenticate against your Cloudflare account

```bash
cloudflared tunnel login
```

Opens a browser URL — copy it to a desktop browser if running headless. Pick the zone (domain) you want to attach. A cert is written to `~/.cloudflared/cert.pem`.

#### 3. Create a named tunnel

```bash
cloudflared tunnel create bookshelf
```

Output includes the tunnel UUID and the path to a credentials JSON file at `~/.cloudflared/<UUID>.json`. Save the UUID — you'll need it in the config and the systemd step.

#### 4. Write the tunnel config

Create `~/.cloudflared/config.yml` (replace the UUID and hostnames):

```yaml
tunnel: <UUID>
credentials-file: /home/<user>/.cloudflared/<UUID>.json

ingress:
  - hostname: readingbookshelf.com
    service: http://localhost:3000
  - hostname: www.readingbookshelf.com
    service: http://localhost:3000
  - service: http_status:404
```

The trailing `http_status:404` is required — every ingress list needs a catch-all.

#### 5. Route DNS through the tunnel

For each hostname listed in `config.yml`:

```bash
cloudflared tunnel route dns bookshelf readingbookshelf.com
cloudflared tunnel route dns bookshelf www.readingbookshelf.com
```

This creates Cloudflare DNS `CNAME` records pointing at `<UUID>.cfargotunnel.com`.

#### 6. Test in the foreground

```bash
cloudflared tunnel run bookshelf
```

Hit `https://<your-domain>` in a browser. You should see the app (TLS is handled at Cloudflare's edge — your origin stays plain HTTP on `localhost:3000`). Ctrl+C when verified.

#### 7. Update Auth0 for the production URL

Because the app sits behind a TLS-terminating proxy, `request.url` inside the app reports `http://` — the redirect URI must come from an env var instead. In `packages/database/.env` on the Pi:

```
AUTH0_CALLBACK_URL=https://readingbookshelf.com/auth/callback
```

Then in the Auth0 dashboard for the production app, add:

- **Allowed Callback URLs:** `https://readingbookshelf.com/auth/callback`
- **Allowed Logout URLs:** `https://readingbookshelf.com`
- **Allowed Web Origins:** `https://readingbookshelf.com`

Restart the stack so the new env is picked up: `docker compose -f docker-compose.prod.yml up -d --force-recreate web`.

#### 8. Install `cloudflared` as a systemd service

`sudo cloudflared service install` looks for config in `/etc/cloudflared/`, not your user's home directory — so the user-home config and credentials need to be copied there first, and the `credentials-file:` path inside `config.yml` needs to be rewritten:

```bash
sudo mkdir -p /etc/cloudflared
sudo cp ~/.cloudflared/config.yml /etc/cloudflared/config.yml
sudo cp ~/.cloudflared/<UUID>.json /etc/cloudflared/
sudo sed -i "s|/home/$USER/.cloudflared|/etc/cloudflared|g" /etc/cloudflared/config.yml

sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
sudo systemctl status cloudflared
```

`Active: active (running)` means the tunnel will survive reboots and SSH disconnects. Hit `https://<your-domain>` once more to confirm.

#### Troubleshooting

- **`Cannot determine default configuration path`** — you ran `sudo cloudflared service install` without copying config to `/etc/cloudflared/`. See step 8.
- **Auth0 "Callback URL mismatch"** — the `redirect_uri` in the authorize URL doesn't match Auth0's allowed list. Confirm both the env var and the dashboard list are exactly `https://<domain>/auth/callback` (not `www.`, not `http://`).
- **Infinite redirect loop after login** — session cookie is `Secure`-only but the request reached the app over plain HTTP. Verify the tunnel is the path in (not the LAN IP) and that the Auth0 callback URL is `https://`.
- **`cloudflared: command not found` after install** — the apt source line is wrong (RPM URL). Recheck step 1.

## Data model

- **User** — id, email (unique), name, timestamps. Has many Books.
- **Book** — id, title, author, shelf, rating (nullable). Belongs to User. Has many Notes.
- **Note** — id, content, timestamps. Belongs to Book (cascade delete).
- **Shelf enum** — `WANT_TO_READ`, `READING`, `FINISHED`.

## License

Personal project. No license granted.
