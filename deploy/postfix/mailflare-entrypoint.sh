#!/bin/sh
# Production entrypoint for Mailflare outbound Postfix.
# Loads EVERY registered domain from the shared Mailflare volume — no hardcoded
# customer domains and no POSTFIX_ALLOWED_SENDER_DOMAINS in Coolify env.
set -eu

# Coolify injects MAIL_HOSTNAME from .env; boky/postfix reads HOSTNAME.
if [ -n "${MAIL_HOSTNAME:-}" ]; then
	export HOSTNAME="$MAIL_HOSTNAME"
fi

MAILFLARE_DATA="${MAILFLARE_DATA_DIR:-/mailflare-data}"
DOMAINS_FILE="${MAILFLARE_DATA}/outbound/sender-domains.txt"
DKIM_PUB_DIR="${MAILFLARE_DATA}/outbound/dkim"
SELECTOR="${DKIM_SELECTOR:-mail}"
KEYS_ROOT="${OPENDKIM_KEYS_DIR:-/etc/opendkim/keys}"

mkdir -p "${MAILFLARE_DATA}/outbound" "$DKIM_PUB_DIR" "$KEYS_ROOT"
# Mailflare runs as uid `node` and must write sender-domains.txt here; Postfix
# (root) creates these dirs first — without a world-writable outbound, sync never
# lands and DKIM stays empty forever.
chmod 1777 "${MAILFLARE_DATA}/outbound" "$DKIM_PUB_DIR" 2>/dev/null || true

load_allowed_domains() {
	if [ ! -f "$DOMAINS_FILE" ]; then
		export ALLOW_EMPTY_SENDER_DOMAINS=true
		export ALLOWED_SENDER_DOMAINS="${ALLOWED_SENDER_DOMAINS:-}"
		return 0
	fi
	# Space-separated list for boky/postfix (also accepts newlines in some versions).
	domains=$(
		tr -d '\r' <"$DOMAINS_FILE" |
			tr '[:upper:]' '[:lower:]' |
			sed 's/#.*//' |
			tr -s '[:space:]' '\n' |
			sed '/^$/d' |
			sort -u |
			tr '\n' ' ' |
			sed 's/[[:space:]]*$//'
	)
	if [ -z "$domains" ]; then
		export ALLOW_EMPTY_SENDER_DOMAINS=true
		export ALLOWED_SENDER_DOMAINS=
	else
		# With a concrete list, boky wires DKIM KeyTable/SigningTable for each domain.
		export ALLOW_EMPTY_SENDER_DOMAINS=
		export ALLOWED_SENDER_DOMAINS="$domains"
	fi
}

extract_dkim_txt() {
	# Join quoted chunks from opendkim-genkey output into one v=DKIM1 string.
	tr '\n' ' ' <"$1" |
		sed 's/"/\
/g' |
		sed -n '/^v=DKIM1/p' |
		tr -d '\n' |
		sed 's/[[:space:]]*$//'
}

publish_dkim_for_ui() {
	[ ! -f "$DOMAINS_FILE" ] && return 0
	while IFS= read -r domain || [ -n "$domain" ]; do
		domain=$(printf '%s' "$domain" | tr -d '\r' | tr '[:upper:]' '[:lower:]' | sed 's/[[:space:]]//g')
		[ -z "$domain" ] && continue
		case "$domain" in \#*) continue ;; esac
		txt_file=""
		for candidate in \
			"${KEYS_ROOT}/${domain}.txt" \
			"${KEYS_ROOT}/${domain}/${SELECTOR}.txt" \
			"${KEYS_ROOT}/${domain}/mail.txt" \
			"${KEYS_ROOT}/${SELECTOR}.${domain}.txt"; do
			if [ -f "$candidate" ]; then
				txt_file="$candidate"
				break
			fi
		done
		[ -z "$txt_file" ] && continue
		content=$(extract_dkim_txt "$txt_file")
		if [ -n "$content" ]; then
			printf '%s\n' "$content" >"${DKIM_PUB_DIR}/${domain}.txt"
		else
			echo "mailflare-postfix: could not parse DKIM TXT from $txt_file for $domain" >&2
		fi
	done <"$DOMAINS_FILE"
}

# Pin OpenDKIM so KeyTable/SigningTable rebuild on startup matches our key layout.
export DKIM_BACKEND="${DKIM_BACKEND:-opendkim}"
export DKIM_AUTOGENERATE="${DKIM_AUTOGENERATE:-true}"
export DKIM_SELECTOR="$SELECTOR"

load_allowed_domains

# When Mailflare adds/removes a domain, restart so boky rebuilds sender + DKIM tables.
(
	last="none"
	[ -f "$DOMAINS_FILE" ] && last=$(cksum "$DOMAINS_FILE" | awk '{print $1" "$2}')
	while true; do
		sleep "${POSTFIX_DOMAIN_SYNC_INTERVAL:-30}"
		publish_dkim_for_ui || true
		cur="none"
		[ -f "$DOMAINS_FILE" ] && cur=$(cksum "$DOMAINS_FILE" | awk '{print $1" "$2}')
		if [ "$cur" != "$last" ]; then
			echo "mailflare-postfix: sender-domains.txt changed — restarting to reload all domains/DKIM"
			last="$cur"
			# Terminate the main process group; Docker restarts this service.
			kill -TERM 1 2>/dev/null || kill -TERM $$ 2>/dev/null || true
			exit 0
		fi
	done
) &

# Publish whatever keys already exist after a short delay (DKIM_AUTOGENERATE runs during run.sh).
(
	sleep 10
	publish_dkim_for_ui || true
	sleep 20
	publish_dkim_for_ui || true
	sleep 30
	publish_dkim_for_ui || true
) &

exec /scripts/run.sh
