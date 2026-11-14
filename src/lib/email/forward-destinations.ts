/** Compare addresses without display names. Local so delivery code can import it without the MIME parser. */
export function normalizeForwardAddress(value: string): string {
	const trimmed = value.trim().toLowerCase();
	const wrapped = trimmed.match(/<([^>]+)>\s*$/);
	return (wrapped?.[1] ?? trimmed).trim();
}

/**
 * First usable candidate wins. Blanks, the mailbox's own addresses, and
 * duplicates are dropped. The original trimmed address is what gets sent.
 */
export function uniqueForwardDestinations(
	candidates: Array<string | null | undefined>,
	blockedAddresses: Array<string | null | undefined>,
): string[] {
	const blocked = new Set(
		blockedAddresses
			.map((value) => (value ? normalizeForwardAddress(value) : ""))
			.filter((value) => value.length > 0),
	);
	const destinations: string[] = [];
	for (const candidate of candidates) {
		const destination = candidate?.trim() ?? "";
		if (!destination) continue;
		const normalized = normalizeForwardAddress(destination);
		if (!normalized || blocked.has(normalized)) continue;
		blocked.add(normalized);
		destinations.push(destination);
	}
	return destinations;
}

/**
 * Send each copy on its own. One rejected destination must not stop the rest,
 * and must not stop the original message from being stored.
 */
export async function deliverCopyForwards(
	recipient: string,
	destinations: readonly string[],
	send: (destination: string) => Promise<boolean | void>,
): Promise<void> {
	for (const destination of destinations) {
		try {
			await send(destination);
		} catch (error) {
			console.error(`Copy forward failed for ${recipient} -> ${destination}`, error);
		}
	}
}

/** Insert headers at the top of a raw RFC 5322 message so a later hop can see them. */
export function prependRawHeaders(raw: Uint8Array, headers: Record<string, string>): Uint8Array {
	const lines = Object.entries(headers)
		.filter(([, value]) => value.trim().length > 0)
		.map(([name, value]) => `${name}: ${value.replace(/[\r\n]+/g, " ")}`);
	if (lines.length === 0) return raw;
	const prefix = new TextEncoder().encode(`${lines.join("\r\n")}\r\n`);
	const out = new Uint8Array(prefix.length + raw.length);
	out.set(prefix, 0);
	out.set(raw, prefix.length);
	return out;
}
