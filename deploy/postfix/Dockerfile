# Outbound Postfix for Mailflare (Coolify).
# Domains come from DATA_DIR/outbound/sender-domains.txt — never hardcode customers.
FROM boky/postfix:latest

ENV ALLOW_EMPTY_SENDER_DOMAINS=true \
	ALLOWED_SENDER_DOMAINS= \
	DKIM_BACKEND=opendkim \
	DKIM_AUTOGENERATE=true \
	DKIM_SELECTOR=mail \
	MAILFLARE_DATA_DIR=/mailflare-data \
	POSTFIX_DOMAIN_SYNC_INTERVAL=30

COPY mailflare-entrypoint.sh /mailflare-entrypoint.sh
RUN chmod +x /mailflare-entrypoint.sh

# Keep tini as PID 1; our script loads domains then runs boky's /scripts/run.sh
ENTRYPOINT ["/tini", "--", "/mailflare-entrypoint.sh"]
CMD []
