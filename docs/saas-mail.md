# Send and receive mail (SaaS / Coolify)

This guide matches a self-hosted Dispatch on your operator host (e.g.
`MAIL_HOSTNAME=mail.example.com`) with customer domains on any DNS provider.

## How mail flows

| Direction | Path |
|-----------|------|
| **Receive** | Internet → MX → `MAIL_HOSTNAME:25` → Dispatch SMTP → mailbox |
| **Send** | Compose → `/api/send` → Postfix (`SMTP_URL=smtp://postfix:587`) → internet |

The default Coolify compose uses Postfix (`SMTP_URL`) for all customer domains.

## 1. App environment (Coolify)

```bash
APP_URL=https://mail.example.com
MAIL_HOSTNAME=mail.example.com
SMTP_URL=smtp://postfix:587
SMTP_TLS_REJECT_UNAUTHORIZED=false
SAAS_MODE=true
# No POSTFIX_ALLOWED_SENDER_DOMAINS — every domain in Dispatch is included automatically.
```

`MAIL_HOSTNAME` must resolve to your Coolify VPS **DNS only (grey cloud)**. Open
**TCP 25** inbound for receive and outbound for Postfix delivery.

## 2. Client onboarding (any domain)

1. Admin → **Domains** → add the customer hostname → publish ownership TXT → verify.
2. Admin → **Mailboxes** → create addresses on that domain (no domain allowlist env).
3. Domains → **Show details** → publish MX, SPF, DMARC, and `mail._domainkey` DKIM
   (Postfix generates DKIM; refresh details after ~30s for the Content value).
4. Switch to the mailbox → **Compose** to send.

There are **no per-domain Coolify env edits**. Adding `client-a.com` then
`client-b.com` only requires DNS at each client’s DNS host.

## 3. DNS checklist (per customer domain)

| Type | Name | Value |
|------|------|--------|
| **MX** | `@` | Priority `10` → your `MAIL_HOSTNAME` |
| **TXT** | `@` | `v=spf1 a:MAIL_HOSTNAME ~all` (merge if SPF already exists) |
| **TXT** | `_dmarc` | `v=DMARC1; p=none` |
| **TXT** | `mail._domainkey` | Content from Domains → Setup → DKIM (Postfix) |

Skip Cloudflare `cf-bounce` records when using Postfix.

## 4. Smoke test

1. External mail → customer mailbox appears in Inbox.
2. Compose from that mailbox → arrives at Gmail (check spam on a fresh VPS IP).

## 5. If send fails

- Postfix / Dispatch logs: SMTP connection refused → `SMTP_URL` / compose network.
- No DKIM Content in UI → wait for Postfix restart after domain sync, then refresh.
- VPS blocks outbound 25 → Postfix cannot deliver (host limitation).

## 6. If receive fails

- Missing/wrong MX, port 25 closed, or `MAIL_HOSTNAME` orange-clouded.
- Mailbox local part does not match the recipient address.
