#!/bin/sh
# Production entrypoint for Mailflare outbound Postfix.
# Loads EVERY registered domain from the shared Mailflare volume — no hardcoded
# customer domains and no POSTFIX_ALLOWED_SENDER_DOMAINS in Coolify env.
set -eu

MAILFLARE_DATA="${MAILFLARE_DATA_DIR:-/mailflare-data}"
DOMAINS_FILE="${MAILFLARE_DATA}/outbound/sender-domains.txt"
DKIM_PUB_DIR="${MAILFLARE_DATA}/outbound/dkim"
SELECTOR="${DKIM_SELECTOR:-mail}"
KEYS_ROOT="${OPENDKIM_KEYS_DIR:-/etc/opendkim/keys}"

mkdir -p "${MAILFLARE_DATA}/outbound" "$DKIM_PUB_DIR" "$KEYS_ROOT"

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

publish_dkim_for_ui() {
	[ ! -f "$DOMAINS_FILE" ] && return 0
	while IFS= read -r domain || [ -n "$domain" ]; do
		domain=$(printf '%s' "$domain" | tr -d '\r' | tr '[:upper:]' '[:lower:]' | sed 's/[[:space:]]//g')
		[ -z "$domain" ] && continue
		case "$domain" in \#*) continue ;; esac
		txt_file="${KEYS_ROOT}/${domain}/${SELECTOR}.txt"
		# boky may also write keys as ${domain}.txt at the keys root
		[ -f "$txt_file" ] || txt_file="${KEYS_ROOT}/${domain}.txt"
		[ -f "$txt_file" ] || continue
		content=$(
			tr '\n' ' ' <"$txt_file" |
				sed -e 's/.*TXT[[:space:]]*//' -e 's/"[[:space:]]*"//g' -e 's/"//g' -e 's/[[:space:]]*$//' -e 's/^[[:space:]]*//'
		)
		[ -n "$content" ] && printf '%s\n' "$content" >"${DKIM_PUB_DIR}/${domain}.txt"
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
			# Terminate the main process group; Docker restarts this service.
			kill -TERM 1 2>/dev/null || kill -TERM $$ 2>/dev/null || true
			exit 0
		fi
	done
) &

# Publish whatever keys already exist after a short delay (DKIM_AUTOGENERATE runs during run.sh).
(
	sleep 15
	publish_dkim_for_ui || true
	sleep 45
	publish_dkim_for_ui || true
) &

exec /scripts/run.sh
