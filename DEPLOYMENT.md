# Bookshelf — Deployment Runbook

End-to-end setup for self-hosting Bookshelf on a Raspberry Pi 5 behind Cloudflare Tunnel, with GitHub Actions CI/CD, nightly encrypted backups, and GitHub-managed production secrets.

Audience: anyone reproducing this stack on their own Pi, or future-me coming back to operate it.

## Table of contents

- [Architecture overview](#architecture-overview)
- [Initial-setup lifecycle (one-time)](#initial-setup-lifecycle-one-time)
- [Cloudflare Tunnel setup](#cloudflare-tunnel-setup)
- [GitHub Actions self-hosted runner](#github-actions-self-hosted-runner)
- [CI/CD workflows](#cicd-workflows)
- [Secret management](#secret-management)
- [Nightly Postgres backups](#nightly-postgres-backups)
- [Manual backup](#manual-backup-on-demand)
- [Restore to production (rollback)](#restore-to-production-rollback--disaster-recovery)
- [Restoring on a new Pi (full disaster recovery)](#restoring-on-a-new-pi-full-disaster-recovery)

## Architecture overview

```
        ┌─────────────────────┐         ┌──────────────────────┐
visitor─┤ Cloudflare edge (TLS)├────────┤ cloudflared (Pi)     │
        └─────────────────────┘  HTTPS  └──────────┬───────────┘
                                                   │ plain HTTP
                                                   ▼
                                  ┌────────────────────────────────┐
                                  │ Docker Compose stack on Pi 5   │
                                  │  ┌─────────┐    ┌─────────┐    │
                                  │  │ app:3000│───▶│ db:5432 │    │
                                  │  └─────────┘    └────┬────┘    │
                                  └──────────────────────│─────────┘
                                                         │
                              ┌──────────────────────────┘
                              ▼
   GitHub PR + merge ─▶ CI ─▶ CD ─▶ self-hosted runner on Pi:
                                     - git fetch + reset --hard
                                     - materialize .env from GH Secrets
                                     - docker compose up -d --build
                                     - curl /health
                                     - docker image prune

   3 AM nightly ─▶ systemd timer ─▶ backup.sh:
                                     - docker exec pg_dump -Fc
                                     - rclone copy (encrypted) → B2
                                     - prune local 7d / remote 30d
                                     - ping healthchecks.io
```

## Initial-setup lifecycle (one-time)

Two things flip between "set up once by hand" and "managed by CD" during initial setup. Knowing the cutover prevents confusion:

| | Before first deploy | After first deploy |
|---|---|---|
| `~/Bookshelf/packages/database/.env` on the Pi | You create it manually (just to bring the stack up the first time) | **CD overwrites it on every deploy** from GitHub Secrets. Manual edits are clobbered. |
| `cloudflared` config | Manual setup | Stays put; nothing automated touches it |
| `~/scripts/backup.sh` | You copy it from `scripts/backup.sh` in the repo and edit constants | Stays put; nothing automated touches it |
| Docker Compose stack | First `docker compose up -d --build` is manual | After GHA runner is registered, CD owns deploys |

Run the sections in this order to get from zero to a fully running production stack:

1. [Cloudflare Tunnel setup](#cloudflare-tunnel-setup) — get the domain pointing at your Pi
2. [GitHub Actions self-hosted runner](#github-actions-self-hosted-runner) — register the Pi as a deploy target
3. [Secret management](#secret-management) — add secrets to GitHub
4. [CI/CD workflows](#cicd-workflows) — push code, watch first CD complete (your `.env` is now CD-managed)
5. [Nightly Postgres backups](#nightly-postgres-backups) — turn on backups + restore drill

## Cloudflare Tunnel setup

Assumes Docker + Docker Compose are already installed on the Pi, the repo is cloned at `~/Bookshelf`, and you own a domain with Cloudflare-managed nameservers (automatic via Cloudflare Registrar).

### 1. Install `cloudflared` from Cloudflare's Debian apt repo

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

### 2. Authenticate against your Cloudflare account

```bash
cloudflared tunnel login
```

Opens a browser URL — copy it to a desktop browser if running headless. Pick the zone (domain) you want to attach. A cert is written to `~/.cloudflared/cert.pem`.

### 3. Create a named tunnel

```bash
cloudflared tunnel create bookshelf
```

Output includes the tunnel UUID and the path to a credentials JSON file at `~/.cloudflared/<UUID>.json`. Save the UUID — you'll need it in the config and the systemd step.

### 4. Write the tunnel config

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

### 5. Route DNS through the tunnel

For each hostname listed in `config.yml`:

```bash
cloudflared tunnel route dns bookshelf readingbookshelf.com
cloudflared tunnel route dns bookshelf www.readingbookshelf.com
```

This creates Cloudflare DNS `CNAME` records pointing at `<UUID>.cfargotunnel.com`.

### 6. Test in the foreground

```bash
cloudflared tunnel run bookshelf
```

Hit `https://<your-domain>` in a browser. You should see the app (TLS is handled at Cloudflare's edge — your origin stays plain HTTP on `localhost:3000`). Ctrl+C when verified.

### 7. Update Auth0 for the production URL

Because the app sits behind a TLS-terminating proxy, `request.url` inside the app reports `http://` — the redirect URI must come from an env var instead. Add to `packages/database/.env` on the Pi (or to GitHub Secrets if you've already wired CD — see [Secret management](#secret-management)):

```
AUTH0_CALLBACK_URL=https://readingbookshelf.com/auth/callback
```

Then in the Auth0 dashboard for the production app, add:

- **Allowed Callback URLs:** `https://readingbookshelf.com/auth/callback`
- **Allowed Logout URLs:** `https://readingbookshelf.com`
- **Allowed Web Origins:** `https://readingbookshelf.com`

Restart the stack so the new env is picked up:

```bash
docker compose -f docker-compose.prod.yml --env-file packages/database/.env up -d --force-recreate app
```

### 8. Install `cloudflared` as a systemd service

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

`Active: active (running)` means the tunnel will survive reboots and SSH disconnects.

### Troubleshooting

- **`Cannot determine default configuration path`** — you ran `sudo cloudflared service install` without copying config to `/etc/cloudflared/`. See step 8.
- **Auth0 "Callback URL mismatch"** — the `redirect_uri` in the authorize URL doesn't match Auth0's allowed list. Confirm both the env var and the dashboard list are exactly `https://<domain>/auth/callback` (not `www.`, not `http://`).
- **Infinite redirect loop after login** — session cookie is `Secure`-only but the request reached the app over plain HTTP. Verify the tunnel is the path in (not the LAN IP) and that the Auth0 callback URL is `https://`.
- **`cloudflared: command not found` after install** — the apt source line is wrong (RPM URL). Recheck step 1.

## GitHub Actions self-hosted runner

A self-hosted runner is a daemon you install on the Pi that opens an outbound long-poll connection to GitHub and waits for jobs targeted at the label `self-hosted`. When a job arrives, it executes locally on the Pi — which is what lets the CD workflow do things like `git pull` and `docker compose up -d` against the live stack.

### 1. Create the runner in GitHub

In the repo: **Settings → Actions → Runners → New self-hosted runner**.

Pick **Linux** and **ARM64**. GitHub generates a one-time registration token and shows install commands tailored to that platform. Keep that page open — the token expires in ~1 hour.

### 2. Download the runner on the Pi

```bash
cd ~
mkdir actions-runner && cd actions-runner

# Replace X.Y.Z with the version GitHub shows you on the new-runner page
curl -o actions-runner-linux-arm64-X.Y.Z.tar.gz -L \
  https://github.com/actions/runner/releases/download/vX.Y.Z/actions-runner-linux-arm64-X.Y.Z.tar.gz

# SHA256 line is also on the GitHub page — paste it verbatim
echo "<hash>  actions-runner-linux-arm64-X.Y.Z.tar.gz" | shasum -a 256 -c

tar xzf ./actions-runner-linux-arm64-X.Y.Z.tar.gz
```

- Put it in your home directory, not inside `~/Bookshelf`. The runner keeps its own state (`_work/`, `.runner`, `.credentials`) which shouldn't mingle with the app repo.
- The `shasum -c` step verifies the tarball matches what GitHub published — supply-chain hygiene. `OK` means good.

### 3. Configure (register the runner)

```bash
./config.sh --url https://github.com/<you>/Bookshelf --token <ONE-TIME-TOKEN>
```

Interactive. Defaults are fine for all four prompts:

| Prompt | Default | Notes |
|---|---|---|
| Runner group | `Default` | Only matters in GitHub orgs |
| Runner name | hostname (e.g. `raspberrypi`) | How it appears in the Runners list |
| Runner labels | `self-hosted,Linux,ARM64` | What workflows match against |
| Work folder | `_work` | Where checkouts/builds go |

Look for `√ Connected to GitHub` and `√ Settings Saved.` Do **not** run `./run.sh` after — we want systemd to manage the process.

### 4. Install as a systemd service

From inside `~/actions-runner/`:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status
```

- `svc.sh install` writes `/etc/systemd/system/actions.runner.<owner>-<repo>.<runner-name>.service`, runs `systemctl daemon-reload`, and `systemctl enable` so the runner starts on boot. The unit runs as your user (not root) — important because the runner needs to execute `docker` commands under your `docker` group membership.
- Look for `Active: active (running)` and a recent log line like `Listening for Jobs`.

Verify in the GitHub UI: **Settings → Actions → Runners** should show the runner with a green dot and `Idle` status.

### 5. Authorize the runner to run Docker without `sudo`

Already done when you installed Docker (you added your user to the `docker` group). To verify:

```bash
docker ps      # should succeed without sudo
groups         # should include "docker"
```

If `docker ps` errors with permission denied: `sudo usermod -aG docker $USER`, then log out and back in.

### Troubleshooting

- **Job stuck on "Waiting for a runner to pick up this job"** — runner is offline or its labels don't match `runs-on:`. Check Settings → Actions → Runners. If the runner's labels don't include what the workflow asks for, edit labels in the GitHub UI or simplify the workflow's `runs-on:` to just `self-hosted`.
- **`./svc.sh install` fails with permission errors** — must be run with `sudo`. Same applies to `start` and `status`.
- **Runner shows Offline despite systemd saying active** — usually a clock skew or network blip. Restart: `sudo systemctl restart actions.runner.<owner>-<repo>.<runner>.service`.

## CI/CD workflows

Two workflows live in `.github/workflows/`:

- **`ci.yml`** — runs on every PR (and on pushes to `main` as a redundant safety net). Four jobs: `lint`, `check-types`, `build`, `e2e`. The first three run on hosted Ubuntu runners; `e2e` spins up a Postgres service container, applies migrations, and runs the Playwright suite. Branch protection requires all four green before a PR can merge.
- **`cd.yml`** — runs on the self-hosted Pi runner after CI succeeds on `main` (triggered via `workflow_run`). Steps:
  1. `git fetch + reset --hard origin/main` in `~/Bookshelf`
  2. Materialize `.env` from GitHub Secrets (see [Secret management](#secret-management))
  3. `docker compose up -d --build` with `--env-file packages/database/.env`
  4. Wait up to 60s for `curl /health` to respond
  5. `docker image prune -f` to reclaim disk

Branch protection settings (Settings → Branches → branch ruleset on `main`):

- Pull request required before merging
- All four CI status checks required to pass
- Direct pushes to `main` blocked
- Force pushes blocked
- Squash-only merges (Settings → General → Pull Requests)

## Secret management

Production secrets are **not stored in any file checked into the repo** and **not edited by hand on the Pi**. They live in GitHub Actions repository secrets, and the CD workflow materializes `~/Bookshelf/packages/database/.env` on the Pi at deploy time from those secrets.

Stored as GitHub Secrets (Settings → Secrets and variables → Actions):

| Secret | What |
|---|---|
| `POSTGRES_PASSWORD` | DB user password (rotate via `ALTER ROLE` + secret update + redeploy) |
| `SESSION_SECRET` | Encrypts the session cookie |
| `AUTH0_DOMAIN` | Your Auth0 tenant hostname |
| `AUTH0_CLIENT_ID` | Auth0 app client ID |
| `AUTH0_CLIENT_SECRET` | Auth0 app client secret |
| `AUTH0_AUDIENCE` | Auth0 API audience identifier |
| `AUTH0_CALLBACK_URL` | `https://<your-domain>/auth/callback` |

Non-secret constants (`POSTGRES_USER=bookshelf`, `POSTGRES_DB=bookshelf`) are hardcoded in the workflow YAML. `DATABASE_URL` is derived in the workflow from `POSTGRES_PASSWORD` — never stored independently, so the two can't drift.

The CD step that writes `.env` (`Materialize .env from GitHub Secrets` in `cd.yml`):

1. **Sanity-checks that every required secret is non-empty** — fails the deploy fast if any are missing, rather than silently writing a broken `.env` that crashes the app
2. **`umask 077`** before writing — `.env` ends up `chmod 600` (owner-only readable)
3. **Writes the file fresh on every deploy** — any manual edit on the Pi is non-persistent. GitHub is the only source of truth.

### Rotating a secret

1. Update the value in GitHub UI (Settings → Secrets → click → Update value)
2. If it's `POSTGRES_PASSWORD`: also run `ALTER ROLE bookshelf WITH PASSWORD '<new>'` against the live DB (the workflow can't do this for you because the secret isn't visible after rotation)
3. Trigger a deploy (push any commit to main, or use "Run workflow" on CD with `workflow_dispatch`)
4. New `.env` written, app restarted with new credentials

### Adding a new env var the app needs

1. Add it as a GitHub Secret
2. Add it to the `env:` block + the heredoc in `cd.yml`'s "Materialize .env" step
3. Add to the sanity-check loop in the same step
4. Push, deploy

## Nightly Postgres backups

Production data is dumped nightly and uploaded — encrypted client-side — to off-site object storage. Failures are surfaced via [healthchecks.io](https://healthchecks.io) email alerts.

### 1. Create the off-site destination + monitoring

**Backblaze B2** (~$6/TB/month, free egress via Cloudflare Bandwidth Alliance):

1. Sign up at [backblaze.com](https://www.backblaze.com/cloud-storage). Create a **private** bucket with SSE-B2 server-side encryption enabled.
2. Generate an **application key** scoped to that bucket with Read+Write access. Save the `keyID` and `applicationKey` immediately — the latter is shown once.

**Healthchecks.io** (free monitoring):

1. Sign up at [healthchecks.io](https://healthchecks.io).
2. Create a check with period **1 day** and grace time **6 hours**.
3. Add an email integration so failed/missed pings notify you.
4. Save the check's ping URL (format: `https://hc-ping.com/<uuid>`).

### 2. Install rclone on the Pi

```bash
curl https://rclone.org/install.sh | sudo bash
rclone version
```

### 3. Fix the ECN-related Backblaze connectivity issue (AT&T-specific)

Some residential ISP equipment silently drops TCP SYN packets that have ECN (Explicit Congestion Notification) bits set. Linux enables ECN by default; Windows disables it. The symptom: `curl https://api.backblazeb2.com/` from the Pi hangs at "Connection timed out" while the same command from a Windows machine on the same LAN succeeds.

Disable ECN persistently:

```bash
echo 'net.ipv4.tcp_ecn=0' | sudo tee /etc/sysctl.d/99-no-ecn.conf
sudo sysctl --system
```

### 4. Configure rclone (B2 remote + encrypted overlay)

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

**Remote 2 — `bookshelf-b2-crypt`** (encryption overlay on top of B2):

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
# In the B2 web UI, the encrypted/ folder shows files with random encrypted names — proves crypt is working
rclone delete bookshelf-b2-crypt:test.txt
rm /tmp/test.txt
```

### 5. Install the backup script

The script is checked into the repo at [`scripts/backup.sh`](./scripts/backup.sh). Copy it to the Pi and edit the placeholder values at the top:

```bash
mkdir -p ~/scripts
cp ~/Bookshelf/scripts/backup.sh ~/scripts/backup.sh
chmod +x ~/scripts/backup.sh
nano ~/scripts/backup.sh   # edit HC_PING_URL (and BACKUP_DIR if your username isn't mpphelps)
```

Test it directly:

```bash
~/scripts/backup.sh
```

Verify the dump landed locally (`ls ~/backups/`), on B2 (`rclone ls bookshelf-b2-crypt:`), and that healthchecks.io shows a green ping.

### 6. Schedule via systemd timer

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

Key options:

- `Type=oneshot` — service exits when the script does; not a long-running daemon
- `User=mpphelps` — runs as your user so it inherits `docker` group + rclone config
- `Persistent=true` — if the Pi is off at 3 AM (power outage), the timer fires as soon as it boots back up
- `RandomizedDelaySec=15m` — adds 0–15 min jitter so the actual fire time is 03:00–03:15

Verify via systemd (different env than your shell):

```bash
sudo systemctl start bookshelf-backup.service
sudo journalctl -u bookshelf-backup.service -n 50 --no-pager
```

### 7. Test the restore path

An untested backup is just hope. Run this drill periodically — once a quarter is reasonable.

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

Counts in the restored DB must match prod.

### Troubleshooting

- **rclone hangs forever on any B2 operation** — almost certainly the ECN issue. Confirm with `curl -v --max-time 15 https://api.backblazeb2.com/`. If it times out from the Pi but works from another machine on the same LAN, disable ECN (see step 3).
- **`rclone lsd bookshelf-b2:` warns "refers to a local folder"** — you forgot the trailing colon. `bookshelf-b2:` is a remote; `bookshelf-b2` is a local directory name.
- **Healthchecks.io shows "down" but Pi is fine** — service may have run but the success ping failed (outbound HTTPS blip). Check `journalctl -u bookshelf-backup.service -n 100` for the actual exit status; one missed ping isn't a real failure.
- **Restore fails with "permission denied" or "role does not exist"** — your throwaway container's user/db setup must match what's in the dump. The `-e POSTGRES_USER=bookshelf -e POSTGRES_DB=bookshelf` flags above handle this.

## Manual backup (on demand)

To take a snapshot at any time — useful before a risky migration, hardware maintenance, or testing the alerting path:

```bash
# Recommended: trigger via systemd (same env as the nightly run, logs to journal)
sudo systemctl start bookshelf-backup.service
sudo journalctl -u bookshelf-backup.service -f
```

Or run the script directly:

```bash
~/scripts/backup.sh
```

Both produce the same result: a timestamped dump in `~/backups/`, an encrypted upload to B2, and a healthcheck ping. The systemd path is preferred because the execution environment matches the nightly run exactly.

## Restore to production (rollback / disaster recovery)

This is the dangerous operation. Read every step before running anything. Bookshelf will be offline during the restore.

### Step 1 — Snapshot the current state first

Even if the current DB is broken, you may need to inspect it later, or recover data added between the chosen backup and now.

```bash
sudo systemctl start bookshelf-backup.service
rclone ls bookshelf-b2-crypt: | sort | tail -3   # confirm a fresh file appeared
```

### Step 2 — Pick which backup to restore from

Filenames are ISO-8601 UTC timestamps, so lexical sort = chronological.

```bash
rclone ls bookshelf-b2-crypt: | sort
RESTORE_FILE="bookshelf-2026-05-24T07-00-00Z.dump"   # ← edit to the one you want
```

### Step 3 — Download the chosen dump

```bash
rclone copy "bookshelf-b2-crypt:$RESTORE_FILE" /tmp/
ls -lh "/tmp/$RESTORE_FILE"
```

### Step 4 — Stop the app to prevent writes during restore

The DB container keeps running; we restore *into* it.

```bash
cd ~/Bookshelf
docker compose -f docker-compose.prod.yml --env-file packages/database/.env stop app
```

### Step 5 — Drop and recreate the database, then restore

```bash
# Copy dump into the DB container
docker cp "/tmp/$RESTORE_FILE" bookshelf-prod-db-1:/tmp/restore.dump

# Drop. FORCE terminates any leftover connections.
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

### Step 6 — Restart the app

```bash
docker compose -f docker-compose.prod.yml --env-file packages/database/.env start app
```

### Step 7 — Verify

```bash
curl -fs https://readingbookshelf.com/health

docker exec bookshelf-prod-db-1 \
  psql -U bookshelf -d bookshelf -c 'SELECT COUNT(*) FROM "User";'
```

Then log in via the browser and confirm the data state matches expectations.

### Step 8 — Clean up

```bash
rm "/tmp/$RESTORE_FILE"
docker exec bookshelf-prod-db-1 rm /tmp/restore.dump
```

## Restoring on a new Pi (full disaster recovery)

If the original Pi is dead — hardware failure, theft, fire. Critical prerequisite: you have your **rclone crypt passphrase + salt** safely in your password manager. Without them, your B2 backups are permanently unreadable.

1. Bring up the new Pi: OS install, SSH, Docker, Docker Compose.
2. Reinstall Cloudflare Tunnel using the same tunnel credentials (re-run `cloudflared tunnel login` if needed, or copy `~/.cloudflared/` from a backup if you have one). DNS automatically points to whichever Pi runs the tunnel — see [Cloudflare Tunnel setup](#cloudflare-tunnel-setup).
3. `git clone https://github.com/<you>/Bookshelf ~/Bookshelf`
4. Recreate `packages/database/.env` with the values from your password manager (one-time; CD will manage it from then on once you reinstall the GHA runner).
5. Disable ECN: `echo 'net.ipv4.tcp_ecn=0' | sudo tee /etc/sysctl.d/99-no-ecn.conf && sudo sysctl --system`.
6. Bring up the stack: `docker compose -f docker-compose.prod.yml --env-file packages/database/.env up -d`. Migrations run automatically — you'll have an empty DB.
7. Install + configure rclone with your **saved passphrase and salt** (not new ones — they must match what encrypted the existing backups). See [Nightly Postgres backups § 4](#4-configure-rclone-b2-remote--encrypted-overlay).
8. Follow [Restore to production](#restore-to-production-rollback--disaster-recovery) to pull the most recent dump into the new Pi.
9. Reinstall the GHA self-hosted runner ([§](#github-actions-self-hosted-runner)), the cloudflared systemd service ([§](#8-install-cloudflared-as-a-systemd-service)), and the backup systemd timer ([§](#6-schedule-via-systemd-timer)).
10. Auth0 dashboard requires no changes — the same domain still works, now routed to the new Pi via the tunnel.
