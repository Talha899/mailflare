/**
 * Normalize user / env input into a bare DNS hostname.
 * Accepts `codenak.com`, `https://codenak.com/`, `CODENAK.COM.` — rejects junk.
 */
export function normalizeDomainHostname(input: string): string {
	let value = (input ?? "").trim().toLowerCase();
	if (!value) return "";

	// Strip scheme + path/query when pasted as a URL.
	if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) || value.includes("/") || value.includes("?")) {
		try {
			const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
			value = new URL(withScheme).hostname;
		} catch {
			value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").split(/[/?#]/)[0] ?? "";
		}
	}

	value = value.replace(/\.+$/, "").replace(/^\.+/, "").trim();
	// Drop trailing port if someone pasted host:443
	value = value.replace(/:\d+$/, "");
	return value;
}

const DOMAIN_HOSTNAME_RE =
	/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

export function isValidDomainHostname(hostname: string): boolean {
	const normalized = normalizeDomainHostname(hostname);
	if (!normalized || normalized.length > 253) return false;
	if (normalized === "localhost") return false;
	return DOMAIN_HOSTNAME_RE.test(normalized);
}

/**
 * Operator MX / SMTP banner host (MAIL_HOSTNAME). Collapses accidental
 * `mail.mail.example.com` when APP_URL was already `mail.example.com`.
 */
export function normalizeMailHostname(input: string): string {
	let value = normalizeDomainHostname(input);
	while (value.startsWith("mail.mail.")) {
		value = value.slice("mail.".length);
	}
	return value;
}

export function assertDomainHostname(input: string): string {
	const normalized = normalizeDomainHostname(input);
	if (!isValidDomainHostname(normalized)) {
		throw new Error(
			`Enter a domain name like example.com (not a URL). Got "${input.trim() || "(empty)"}".`,
		);
	}
	return normalized;
}
