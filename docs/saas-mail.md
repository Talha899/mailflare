# Send and receive mail (SaaS / Coolify)

This guide matches **mail.aiorders.io** hosting customer domains such as
**healudoc.com** (DNS not on the operator Cloudflare account).

## How mail flows

| Direction | Path |
|-----------|------|
| **Receive** | Internet → MX → `mail.aiorders.io:25` → Mailflare SMTP → SQLite mailbox |
| **Send** | Compose → `/api/send` → Cloudflare Email Sending API (`CF_TOKEN` + `CF_ACCOUNT_ID`) |

## 1. App environment (Coolify)

```bash
APP_URL=https://mail.aiorders.io
MAIL_HOSTNAME=mail.aiorders.io
CF_ACCOUNT_ID=...
CF_TOKEN=...   # Email Sending: Edit (and DNS if you manage zones)
```

`mail.aiorders.io` must resolve to your Coolify VPS **with Cloudflare proxy off
(DNS only / grey cloud)** for inbound SMTP. Orange-cloud proxying breaks MX to
that host.

Open **TCP 25** on the VPS firewall. If your provider blocks 25, set
`SMTP_INBOUND_PORT=0` and use `deploy/cloudflare-email-relay` instead
(different MX: Cloudflare Email Routing hosts, not `mail.aiorders.io`).

## 2. Create mailbox in Mailflare

1. Admin → **Domains** — add and verify domain (TXT ownership).
2. Admin → **Mailboxes** → **New mailbox** (e.g. `sales@healudoc.com`).
3. Open the avatar menu → switch to that mailbox → **Compose** to send.
4. Inbox receives mail for that address after DNS is correct.

## 3. DNS on the customer domain (healudoc.com)

Publish at the domain’s DNS host (e.g. Cloudflare DNS for healudoc.com).

### Receive (required)

| Type | Name | Value |
|------|------|--------|
| **MX** | `@` / `healudoc.com` | `10 mail.aiorders.io` |

Today healudoc.com has **no MX** — inbound cannot work until this exists.

### Send via Cloudflare Email Sending (required for deliverability)

1. In the **operator** Cloudflare account: **Email** → **Email Sending** →
   **Onboard domain** → `healudoc.com`.
2. Publish every record Cloudflare shows (typically SPF/DKIM/MX under a
   `cf-bounce` subdomain).
3. Also set on the apex:

| Type | Name | Value |
|------|------|--------|
| **TXT** | `@` | `v=spf1 include:_spf.mx.cloudflare.net a:mail.aiorders.io ~all` |
| **TXT** | `_dmarc` | `v=DMARC1; p=none` |

Mailflare’s Domains page lists the same checklist for manual zones.

## 4. Smoke test

1. From Gmail, send to `sales@healudoc.com` → appears in Mailflare Inbox.
2. From Mailflare Compose, reply → arrives in Gmail (check spam if SPF/DKIM incomplete).

## 5. If send fails

- Logs: `Cloudflare Email Sending failed (...)` — domain not onboarded or token
  lacks Email Sending permission.
- Domain must be verified/active in Mailflare and the mailbox selected in the UI.

## 6. If receive fails

- No MX / wrong MX.
- Port 25 closed on the VPS.
- `mail.aiorders.io` orange-clouded on Cloudflare.
- Mailbox local part does not match the recipient address.
