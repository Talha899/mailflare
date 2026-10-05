/**
 * Parse opendkim-genkey / boky-postfix `.txt` files into a single DNS TXT value.
 */
export function parseOpenDkimPublicTxt(raw: string): string | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;

	const quoted = [...trimmed.matchAll(/"([^"]*)"/g)].map((m) => m[1]).join("");
	if (quoted.startsWith("v=DKIM1")) return quoted;

	const withoutRecord = trimmed
		.replace(/^[^\n]*\bTXT\b\s*/i, "")
		.replace(/^\(\s*/, "")
		.replace(/\s*\)\s*;?\s*$/, "")
		.trim();
	const dequoted = withoutRecord.replace(/"/g, "").replace(/\s+/g, " ").trim();
	if (dequoted.startsWith("v=DKIM1")) return dequoted;

	return null;
}
