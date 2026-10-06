# Postfix outbound relay for Dispatch (Coolify).
#
# How domains work (no env allowlist):
# 1. Dispatch writes every registered hostname to DATA_DIR/outbound/sender-domains.txt
# 2. This image loads that file into ALLOWED_SENDER_DOMAINS on start
# 3. boky/postfix generates DKIM (selector `mail`) for each domain
# 4. Public keys are copied to DATA_DIR/outbound/dkim/<hostname>.txt for the Domains UI
# 5. When the domains file changes, the container restarts so new clients work immediately
#
# Security: do not publish host ports. Only the compose network (Dispatch) may submit.
# Set SMTP_URL=smtp://postfix:587 on the Dispatch service.
