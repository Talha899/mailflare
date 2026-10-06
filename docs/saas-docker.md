# Multi-organization SaaS (Docker)

Dispatch can run as a multi-tenant email hosting SaaS on Docker: each customer
signs up, gets an organization, connects their domain(s), and creates mailboxes
and aliases. Mail stays in SQLite; organization metadata lives in MongoDB.

## Quick start

```bash
cp .env.docker.example .env.docker
# Set SMTP_URL (or Cloudflare sending), APP_URL, and keep:
#   SAAS_MODE=true
#   MONGO_URL=mongodb://mongo:27017/mailflare
docker compose up -d --build
```

Services:

| Service | Purpose |
|---------|---------|
| `mongo` | Organizations, domain verification tokens, plan limits |
| `Dispatch` | Web UI, API, SMTP inbound (:25), queues, SQLite + blobs |

Open `http://localhost:3000/signup` to create a workspace.

## Customer flow

1. **Sign up** at `/signup` (organization name, admin name, email, password).
2. **Connect a domain** at `/onboarding/domain` or Admin → Domains.
3. **Verify ownership** with the TXT record `_mailflare-verify.<domain>` =
   `mailflare-verification=<token>` (required when DNS is not on your Cloudflare
   account).
4. Publish **MX / SPF / DMARC** (and DKIM if using Cloudflare Sending).
5. Create **mailboxes** and optional **aliases**.
6. Send/receive via the webmail UI; external clients can use **JMAP** + app passwords.

## Domain paths

| Condition | Behavior |
|-----------|----------|
| `CF_TOKEN` set and zone found on that account | Auto Email Routing / sending subdomain (existing Dispatch path) |
| No Cloudflare credentials, or zone not on the account | Manual zone + TXT ownership proof; DNS checklist on the domain page |

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `SAAS_MODE` | `true` in compose | Enables public `/signup` and org scoping |
| `MONGO_URL` | `mongodb://mongo:27017/mailflare` | Tenant metadata store |
| `SMTP_URL` | unset | Outbound relay |
| `CF_TOKEN` / `CF_ACCOUNT_ID` | unset | Optional Cloudflare DNS / zone management |

When `SAAS_MODE` is not `true`, behavior matches classic single-tenant Dispatch
(`/setup` first admin only).

## Billing

Billing and Paymug licenses are **disabled** while `SAAS_MODE=true`. Team-tier
features (accounts, branding, forwarding, shared mailboxes) are unlocked, and
there are no domain/mailbox upgrade caps. Re-enable later when you add Stripe
or another billing system.

## Backups

SQLite backups continue as before. When Mongo is connected, each backup also
writes `mongo-tenants.json` next to the SQLite JSON under the backup prefix in
the blob store.

## E2E checklist

1. `docker compose up -d --build` — `mongo` healthy, app on :3000.
2. Sign up org A → add domain → publish TXT → Verify → create mailbox → send test mail.
3. Sign up org B with another domain — org A must not see B’s domains/messages.
4. With `CF_TOKEN` and a zone on that account, add domain and confirm auto DNS setup.
5. Point MX at the host (:25) and confirm inbound lands in the correct mailbox.

## Object storage (production)

For Docker, configure S3-compatible storage so MIME blobs, attachments, and
backups are not tied to a single host volume:

| Variable | Purpose |
|----------|---------|
| `S3_ENDPOINT` | API base URL (e.g. `https://s3.example.com`) |
| `S3_BUCKET` | Bucket name |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Credentials |
| `S3_FORCE_PATH_STYLE` | `true` for many self-hosted S3 APIs |
| `S3_KEY_PREFIX` | Optional prefix inside the bucket |

On startup the container logs `Object storage: S3 (...)` when S3 is active.

## Production checklist

1. **Rebuild after code changes:** `docker compose up -d --build`
2. **Public URLs:** `APP_URL=https://mail.example.com`, `MAIL_HOSTNAME=mail.example.com`
3. **Cloudflare (operator, optional):** `CF_TOKEN` + `CF_ACCOUNT_ID` for DNS / zone management on your zones
4. **Mongo:** use a managed URI in production; do not expose port `27017` on the public internet (remove the `mongo` ports mapping or run Mongo off-compose)
5. **Inbound mail:** MX → `MAIL_HOSTNAME`, TCP **25** reachable (or Cloudflare relay + `INBOUND_WEBHOOK_SECRET`)
6. **S3:** run `node scripts/s3-smoke.mjs` with the same env as the container
7. **Smoke:** `node scripts/prod-readiness.mjs https://mail.example.com`

## Deploy on Coolify

Use the Compose file `docker-compose.coolify.yml` (Mongo is not published on the
host; HTTP is proxied by Coolify; SMTP still maps host `:25`).

For **send/receive DNS** on customer domains, see [saas-mail.md](./saas-mail.md).

1. In Coolify: **+ New Resource → Docker Compose**.
2. Connect the Git repo (or push this project to a private Git source Coolify can read).
3. Set **Docker Compose Location** to `/docker-compose.coolify.yml`.
4. Under **Environment Variables**, paste production values (see below). Do **not**
   put secrets in the compose file. Coolify injects them at deploy time.
5. Assign a domain to the **`Dispatch`** service, port **`3000`**, with HTTPS.
6. Deploy. Open `https://your-domain/signup` (SaaS) or `/setup` if `SAAS_MODE` is off.

### Coolify environment variables

`docker-compose.coolify.yml` expects a **managed Mongo** URI (Coolify Mongo
resource or Atlas). Do not use the bundled `mongo` service from local compose.

Minimum for SaaS + Cloudflare sending + S3:

```bash
SAAS_MODE=true
APP_URL=https://mail.codenak.com
MAIL_HOSTNAME=mail.codenak.com
# Coolify Mongo root user — authSource=admin is required:
MONGO_URL=mongodb://root:PASSWORD@HOST:27017/mailflare?directConnection=true&authSource=admin
S3_ENDPOINT=https://s3.codenak.com
S3_REGION=us-east-1
S3_BUCKET=healudoc
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_FORCE_PATH_STYLE=true
S3_KEY_PREFIX=prod_mail
# STORAGE_ENDPOINT / STORAGE_BUCKET / STORAGE_FOLDER also work if you paste those names.
```

Copy a filled local template from `.env.coolify` (gitignored) into Coolify’s
Environment Variables UI. Domain on the `Dispatch` service: port **3000**.

### Coolify mail / ports

| Traffic | How |
|---------|-----|
| HTTPS web + JMAP + WebSocket `/api/realtime` | Coolify domain → service `Dispatch:3000` (enable WebSockets if your Coolify version asks) |
| Inbound SMTP | Host port **25** must reach the container (`25:25` in the compose). Many clouds block 25 — open it on the VPS firewall. |
| Port 25 blocked | Open TCP 25 on the VPS (or host elsewhere that can accept MX). Set `SMTP_INBOUND_PORT=0` only if you intentionally disable inbound SMTP. |

### After deploy

1. Confirm Coolify logs show `Object storage: S3 (...)` and `MongoDB connected`.
2. Hit `https://your-domain/api/setup/status`.
3. Create a workspace at `/signup`, add a domain, publish TXT/MX, create a mailbox, send a test.

## Health

```bash
MONGO_URL=mongodb://127.0.0.1:27017/mailflare node scripts/mongo-health.mjs
node scripts/prod-readiness.mjs http://localhost:3000
```

