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

Restart the stack so the new env is picked up: `docker compose -f docker-compose.prod.yml --env-file packages/database/.env up -d --force-recreate app`.

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

### GitHub Actions self-hosted runner (Raspberry Pi)

A self-hosted runner is a daemon you install on the Pi that opens an outbound long-poll connection to GitHub and waits for jobs targeted at the label `self-hosted`. When a job arrives, it executes locally on the Pi — which is what lets the CD workflow do things like `git pull` and `docker compose up -d` against the live stack.

#### 1. Create the runner in GitHub

In the repo: **Settings → Actions → Runners → New self-hosted runner**.

Pick **Linux** and **ARM64**. GitHub generates a one-time registration token and shows install commands tailored to that platform. Keep that page open — the token expires in ~1 hour and you'll need it in step 3.

#### 2. Download the runner on the Pi

```bash
cd ~
mkdir actions-runner && cd actions-runner

# Replace X.Y.Z with the version GitHub shows you on the new-runner page
curl -o actions-runner-linux-arm64-X.Y.Z.tar.gz -L \
  https://github.com/actions/runner/releases/download/vX.Y.Z/actions-runner-linux-arm64-X.Y.Z.tar.gz

# The SHA256 line is also on the GitHub page — paste it verbatim
echo "<hash>  actions-runner-linux-arm64-X.Y.Z.tar.gz" | shasum -a 256 -c

tar xzf ./actions-runner-linux-arm64-X.Y.Z.tar.gz
```

Two things to know:

- Put it in your home directory, not inside `~/Bookshelf`. The runner keeps its own state (`_work/`, `.runner`, `.credentials`) which shouldn't mingle with the app repo.
- The `shasum -c` step is supply-chain hygiene — it verifies the tarball matches what GitHub published. If it prints `OK`, the binary is intact.

#### 3. Configure (register the runner)

```bash
./config.sh --url https://github.com/<you>/Bookshelf --token <ONE-TIME-TOKEN>
```

This is interactive. Defaults are fine for all four prompts:

| Prompt | Default | Notes |
|---|---|---|
| Runner group | `Default` | Only matters in GitHub orgs |
| Runner name | hostname (e.g. `raspberrypi`) | How it appears in the Runners list |
| Runner labels | `self-hosted,Linux,ARM64` | What workflows match against |
| Work folder | `_work` | Where checkouts/builds go |

You can optionally add a custom label (like `bookshelf-pi`) at the labels prompt — useful if you ever add a second self-hosted runner and want to target one specifically with `runs-on: [self-hosted, bookshelf-pi]`. For a single-runner setup, the defaults are enough.

Watch for `√ Connected to GitHub` and `√ Settings Saved.` Do **not** run `./run.sh` after — we want systemd to manage the process.

#### 4. Install as a systemd service

From inside `~/actions-runner/`:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status
```

What each does:

- **`svc.sh install`** writes `/etc/systemd/system/actions.runner.<owner>-<repo>.<runner-name>.service`, runs `systemctl daemon-reload`, and `systemctl enable` so the runner starts on boot. The unit runs as your user (not root) — important, because the runner needs to execute `docker` commands under your `docker` group membership.
- **`svc.sh start`** starts it now.
- **`svc.sh status`** pretty-prints `systemctl status`. Look for `Active: active (running)` and a recent log line like `Listening for Jobs`.

Then verify in the GitHub UI: **Settings → Actions → Runners** should show the runner with a green dot and `Idle` status.

#### 5. Authorize the runner to run Docker without `sudo`

This step was already done when you installed Docker (you added your user to the `docker` group). To verify:

```bash
docker ps      # should succeed without sudo
groups         # should include "docker"
```

If `docker ps` errors with permission denied, `sudo usermod -aG docker $USER` then log out and back in.

#### Troubleshooting

- **Job stuck on "Waiting for a runner to pick up this job"** — runner is offline or its labels don't match `runs-on:`. Check Settings → Actions → Runners. If the runner's labels don't include what the workflow asks for, edit labels in the GitHub UI or simplify the workflow's `runs-on:` to just `self-hosted`.
- **`./svc.sh install` fails with permission errors** — must be run with `sudo`. Same applies to `start` and `status`.
- **Runner shows Offline despite systemd saying active** — usually a clock skew or network blip. Restart the service: `sudo systemctl restart actions.runner.<owner>-<repo>.<runner>.service`.

### Nightly Postgres backups (Raspberry Pi)

Production data is dumped nightly and uploaded — encrypted client-side — to off-site object storage. Failures are surfaced via [healthchecks.io](https://healthchecks.io) email alerts.

Architecture:

```
03:00 AM local
    │
    ▼
systemd timer ─▶ systemd service ─▶ ~/scripts/backup.sh
                                         │
                                         ├─▶ docker exec ... pg_dump -Fc    (binary, compressed)
                                         ├─▶ rclone copy → crypt overlay → Backblaze B2  (encrypted client-side)
                                         ├─▶ prune local dumps   > 7 days
                                         ├─▶ prune remote dumps  > 30 days
                                         └─▶ ping healthchecks.io  (success or failure)
```

#### 1. Create the off-site destination + monitoring

**Backblaze B2** (cheap S3-compatible storage; ~$6/TB/month, free egress via Cloudflare Bandwidth Alliance):

1. Sign up at [backblaze.com](https://www.backblaze.com/cloud-storage). Create a **private** bucket with SSE-B2 server-side encryption enabled.
2. Generate an **application key** scoped to that bucket with Read+Write access. Save the `keyID` and `applicationKey` immediately — the latter is shown once.

**Healthchecks.io** (free monitoring; alerts you if the nightly ping is missed):

1. Sign up at [healthchecks.io](https://healthchecks.io).
2. Create a check with period **1 day** and grace time **6 hours**.
3. Add an email integration so failed/missed pings notify you.
4. Save the check's ping URL (format: `https://hc-ping.com/<uuid>`).

#### 2. Install rclone on the Pi

```bash
curl https://rclone.org/install.sh | sudo bash
rclone version
```

#### 3. Fix the ECN-related Backblaze connectivity issue (AT&T-specific)

Some residential ISP equipment silently drops TCP SYN packets that have ECN (Explicit Congestion Notification) bits set. Linux enables ECN by default; Windows disables it. The symptom: `curl https://api.backblazeb2.com/` from the Pi hangs at "Connection timed out" while the same command from a Windows machine on the same LAN succeeds.

Disable ECN persistently:

```bash
echo 'net.ipv4.tcp_ecn=0' | sudo tee /etc/sysctl.d/99-no-ecn.conf
sudo sysctl --system
```

#### 4. Configure rclone (B2 remote + encrypted overlay)

Generate a strong passphrase first and **save it to your password manager**. If you lose this, your backups become permanently unreadable.

```bash
openssl rand -base64 32   # copy the output into your password manager
```

Then `rclone config`. Create two remotes:

**Remote 1 — `bookshelf-b2`** (the underlying Backblaze access):

| Prompt | Answer |
|---|---|
| Type | `b2` |
| account | your **keyID** |
| key | your **applicationKey** |
| hard_delete | `false` |

Verify: `rclone lsd bookshelf-b2:` should list your bucket.

**Remote 2 — `bookshelf-b2-crypt`** (encryption overlay sitting on top of the B2 remote):

| Prompt | Answer |
|---|---|
| Type | `crypt` |
| remote | `bookshelf-b2:<your-bucket>/encrypted` |
| filename_encryption | `standard` |
| directory_name_encryption | `true` |
| password | the passphrase you generated |
| password2 | generate a random salt; save it to your password manager too |

Sanity-check the round-trip:

```bash
echo "test" > /tmp/test.txt
rclone copy /tmp/test.txt bookshelf-b2-crypt:
rclone ls bookshelf-b2-crypt:                   # should show test.txt
# In the B2 web UI, the encrypted/ folder shows files with random encrypted names — that proves crypt is working end-to-end.
rclone delete bookshelf-b2-crypt:test.txt
rm /tmp/test.txt
```

#### 5. Install the backup script

Save the script at `~/scripts/backup.sh`. It reads its config (healthcheck URL, retention, container name) from constants at the top of the file — edit those for your environment. Script summary:

- Pings `<HC_URL>/start` so healthchecks sees a run began
- `trap '... /fail'` on any error so a failure triggers an alert
- `docker exec bookshelf-prod-db-1 pg_dump -Fc -U bookshelf bookshelf` → writes to `~/backups/bookshelf-<ISO-timestamp>.dump`
- Refuses to upload zero-byte dumps (protects you from overwriting good backups with garbage if pg_dump silently fails)
- `rclone copy` to the encrypted remote
- `find ... -mtime +7 -delete` for local pruning
- `rclone delete --min-age 30d` for remote pruning
- Final ping to `<HC_URL>` on success

Make it executable and test it directly:

```bash
chmod +x ~/scripts/backup.sh
~/scripts/backup.sh
```

Verify the dump landed locally (`ls ~/backups/`), on B2 (`rclone ls bookshelf-b2-crypt:`), and that healthchecks.io shows a green ping.

#### 6. Schedule via systemd timer

Two unit files:

```bash
sudo tee /etc/systemd/system/bookshelf-backup.service > /dev/null << 'EOF'
[Unit]
Description=Bookshelf Postgres backup
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=mpphelps
ExecStart=/home/mpphelps/scripts/backup.sh
StandardOutput=journal
StandardError=journal
EOF

sudo tee /etc/systemd/system/bookshelf-backup.timer > /dev/null << 'EOF'
[Unit]
Description=Run Bookshelf Postgres backup nightly

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true
RandomizedDelaySec=15m

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now bookshelf-backup.timer
systemctl list-timers bookshelf-backup.timer
```

Key options explained:

- **`Type=oneshot`** — service exits when the script does; not a long-running daemon
- **`User=mpphelps`** — runs as your user so it inherits `docker` group membership + your rclone config
- **`Persistent=true`** — if the Pi is off at 3 AM (power outage), the timer fires as soon as it boots back up
- **`RandomizedDelaySec=15m`** — adds 0–15 min jitter so the actual fire time is 03:00–03:15

Verify by running the service via systemd (different env than your shell):

```bash
sudo systemctl start bookshelf-backup.service
sudo journalctl -u bookshelf-backup.service -n 50 --no-pager
```

#### 7. Test the restore path (do this — an untested backup is just hope)

```bash
# Grab the latest dump
LATEST=$(rclone ls bookshelf-b2-crypt: | awk '{print $2}' | sort | tail -1)
rclone copy "bookshelf-b2-crypt:$LATEST" /tmp/

# Spin up a throwaway Postgres (separate from prod)
docker run -d --name bookshelf-restore-test \
  -e POSTGRES_USER=bookshelf -e POSTGRES_PASSWORD=bookshelf -e POSTGRES_DB=bookshelf \
  postgres:17
sleep 5

# Restore
docker cp "/tmp/$LATEST" bookshelf-restore-test:/tmp/backup.dump
docker exec bookshelf-restore-test pg_restore -U bookshelf -d bookshelf -v /tmp/backup.dump

# Verify data parity vs prod
docker exec bookshelf-restore-test \
  psql -U bookshelf -d bookshelf -c 'SELECT COUNT(*) AS users FROM "User";'
docker exec bookshelf-prod-db-1 \
  psql -U bookshelf -d bookshelf -c 'SELECT COUNT(*) AS users FROM "User";'

# Cleanup
docker stop bookshelf-restore-test && docker rm bookshelf-restore-test
rm "/tmp/$LATEST"
```

Counts in the restored DB must match prod. Run this drill periodically — once a quarter is a reasonable cadence.

#### Manual backup (on demand)

To take a snapshot at any time — useful before a risky migration, hardware maintenance, or testing the alerting path:

```bash
# Recommended: trigger via systemd (same env as the nightly run, logs to journal)
sudo systemctl start bookshelf-backup.service

# Watch it run
sudo journalctl -u bookshelf-backup.service -f
```

Or just run the script directly — useful for debugging the script itself:

```bash
~/scripts/backup.sh
```

Both produce the same result: a timestamped dump in `~/backups/`, an encrypted upload to B2, and a healthcheck ping. The systemd path is preferred because the execution environment matches the nightly run exactly.

#### Restore to production (rollback / disaster recovery)

This is the dangerous operation. Read every step before running anything. Bookshelf will be offline during the restore.

**Step 1 — Snapshot the current state first.** Even if the current DB is broken, you may need to inspect it later, or recover data added between the chosen backup and now.

```bash
sudo systemctl start bookshelf-backup.service
# Confirm a fresh file appeared on B2 before proceeding
rclone ls bookshelf-b2-crypt: | sort | tail -3
```

**Step 2 — Pick which backup to restore from.** Filenames are ISO-8601 UTC timestamps, so lexical sort = chronological.

```bash
rclone ls bookshelf-b2-crypt: | sort
RESTORE_FILE="bookshelf-2026-05-24T07-00-00Z.dump"   # ← edit to the one you want
```

**Step 3 — Download the chosen dump.**

```bash
rclone copy "bookshelf-b2-crypt:$RESTORE_FILE" /tmp/
ls -lh "/tmp/$RESTORE_FILE"
```

**Step 4 — Stop the app to prevent writes during restore.** The DB container keeps running; we restore *into* it.

```bash
cd ~/Bookshelf
docker compose -f docker-compose.prod.yml --env-file packages/database/.env stop app
```

**Step 5 — Drop and recreate the database, then restore.**

```bash
# Copy dump into the DB container
docker cp "/tmp/$RESTORE_FILE" bookshelf-prod-db-1:/tmp/restore.dump

# Drop the existing database. FORCE terminates any leftover connections.
docker exec bookshelf-prod-db-1 \
  psql -U bookshelf -d postgres -c 'DROP DATABASE bookshelf WITH (FORCE);'

# Recreate empty
docker exec bookshelf-prod-db-1 \
  psql -U bookshelf -d postgres -c 'CREATE DATABASE bookshelf OWNER bookshelf;'

# Restore from dump
docker exec bookshelf-prod-db-1 \
  pg_restore -U bookshelf -d bookshelf -v /tmp/restore.dump
```

`pg_restore -v` prints every CREATE / ALTER / COPY as it runs. Watch for ERROR lines (warnings about "must be owner" or "role does not exist" can usually be ignored; data-loading errors cannot).

**Step 6 — Restart the app.**

```bash
docker compose -f docker-compose.prod.yml --env-file packages/database/.env start app
```

**Step 7 — Verify.**

```bash
# App alive
curl -fs https://readingbookshelf.com/health

# Spot-check data matches expectations
docker exec bookshelf-prod-db-1 \
  psql -U bookshelf -d bookshelf -c 'SELECT COUNT(*) FROM "User";'
```

Then log in via the browser and confirm the data state is what you expected from that backup point in time.

**Step 8 — Clean up.**

```bash
rm "/tmp/$RESTORE_FILE"
docker exec bookshelf-prod-db-1 rm /tmp/restore.dump
```

#### Restoring on a new Pi (full disaster recovery)

If the original Pi is dead — hardware failure, theft, fire — and you're rebuilding on new hardware. Critical prerequisite: you have your **rclone crypt passphrase + salt** safely in your password manager. Without them, your B2 backups are permanently unreadable.

1. Bring up the new Pi: OS install, SSH, Docker, Docker Compose (see earlier sections in this README).
2. Reinstall Cloudflare Tunnel using the same tunnel credentials (re-run `cloudflared tunnel login` if needed, or copy `~/.cloudflared/` from a backup if you have one). DNS automatically points to whichever Pi is running the tunnel.
3. `git clone https://github.com/<you>/Bookshelf ~/Bookshelf`
4. Recreate `packages/database/.env` with the values from your password manager (Auth0 secrets, SESSION_SECRET, DATABASE_URL).
5. Disable ECN (`echo 'net.ipv4.tcp_ecn=0' | sudo tee /etc/sysctl.d/99-no-ecn.conf && sudo sysctl --system`).
6. Bring up the stack: `docker compose -f docker-compose.prod.yml up -d`. Migrations run automatically — you'll have an empty DB.
7. Install + configure rclone with **your saved passphrase and salt** (not new ones — they must match what encrypted the existing backups).
8. Follow steps 2–8 of "Restore to production" above to pull your most recent dump into the new Pi's DB.
9. Reinstall the GHA self-hosted runner, the cloudflared systemd service, and the backup systemd timer (see earlier sections).
10. Auth0 dashboard requires no changes — the same domain still works, now routed to the new Pi via the tunnel.

#### Troubleshooting

- **rclone hangs forever on any B2 operation** — almost certainly the ECN issue. Confirm with `curl -v --max-time 15 https://api.backblazeb2.com/`. If it times out from the Pi but works from another machine on the same LAN, disable ECN (see step 3).
- **`rclone lsd bookshelf-b2:` warns "refers to a local folder"** — you forgot the trailing colon. `bookshelf-b2:` is a remote; `bookshelf-b2` is a local directory name.
- **Healthchecks.io shows "down" but Pi is fine** — service may have run but the success ping failed (outbound HTTPS blip). Check `journalctl -u bookshelf-backup.service -n 100` for the actual exit status; one missed ping isn't a real failure.
- **Restore fails with "permission denied" or "role does not exist"** — your throwaway container's user/db setup must match what's in the dump. The `-e POSTGRES_USER=bookshelf -e POSTGRES_DB=bookshelf` flags above handle this.

### CI/CD workflows

Two workflows live in `.github/workflows/`:

- **`ci.yml`** — runs on every PR (and on pushes to `main` as a redundant safety net). Four jobs: `lint`, `check-types`, `build`, `e2e`. The first three run on hosted Ubuntu runners; `e2e` spins up a Postgres service container, applies migrations, and runs the Playwright suite. Branch protection requires all four green before a PR can merge.
- **`cd.yml`** — runs on the self-hosted Pi runner after CI succeeds on `main` (triggered via `workflow_run`). Pulls latest `main` into `~/Bookshelf`, rebuilds the Compose stack, waits for `/health` to respond, then prunes dangling Docker images.

Repository settings enforced via GitHub UI (Settings → Branches → branch ruleset on `main`):

- Pull request required before merging
- All four CI status checks required to pass
- Direct pushes to `main` blocked
- Force pushes blocked
- Squash-only merges (Settings → General → Pull Requests)

## Data model

- **User** — id, email (unique), name, timestamps. Has many Books.
- **Book** — id, title, author, shelf, rating (nullable). Belongs to User. Has many Notes.
- **Note** — id, content, timestamps. Belongs to Book (cascade delete).
- **Shelf enum** — `WANT_TO_READ`, `READING`, `FINISHED`.

## License

Personal project. No license granted.
