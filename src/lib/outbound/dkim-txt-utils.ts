/** A usable DKIM TXT has a public key (`p=`). Stubs like `v=DKIM1; k=rsa; s=email;` do not. */
export function hasDkimPublicKey(value: string): boolean {
	return /v=DKIM1/i.test(value) && /(?:^|[;\s])p=[A-Za-z0-9+/=]+/.test(value);
}

/**
 * Parse opendkim-genkey / boky-postfix `.txt` files into a single DNS TXT value.
 */
export function parseOpenDkimPublicTxt(raw: string): string | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;

	const quoted = [...trimmed.matchAll(/"([^"]*)"/g)].map((m) => m[1]).join("");
	if (hasDkimPublicKey(quoted)) return quoted;

	const withoutRecord = trimmed
		.replace(/^[^\n]*\bTXT\b\s*/i, "")
		.replace(/^\(\s*/, "")
		.replace(/\s*\)\s*;?\s*$/, "")
		.trim();
	const dequoted = withoutRecord.replace(/"/g, "").replace(/\s+/g, " ").trim();
	if (hasDkimPublicKey(dequoted)) return dequoted;

	return null;
}
