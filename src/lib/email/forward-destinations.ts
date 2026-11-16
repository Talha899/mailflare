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
			const accepted = await send(destination);
			if (accepted === false) console.error(`Copy forward was not accepted for ${recipient} -> ${destination}`);
		} catch (error) {
			console.error(`Copy forward failed for ${recipient} -> ${destination}`, error);
		}
	}
}

/** True when the SMTP relay's final reply accepted the recipient. */
export function forwardDeliveryAccepted(info: {
	accepted?: readonly unknown[];
	rejected?: readonly unknown[];
	response?: string;
}): boolean {
	if ((info.rejected?.length ?? 0) > 0) return false;
	const response = info.response?.trim() ?? "";
	if (response.length > 0 && !response.startsWith("2")) return false;
	return true;
}

function safeHeader(value: string): string {
	return value.replace(/[\r\n]+/g, " ").trim();
}

function headerValue(raw: Uint8Array, name: string): string {
	const text = new TextDecoder("latin1").decode(raw.subarray(0, Math.min(raw.length, 64 * 1024)));
	const end = text.search(/\r?\n\r?\n/);
	const block = (end >= 0 ? text.slice(0, end) : text).replace(/\r?\n[ \t]+/g, " ");
	const match = block.match(new RegExp(`^${name}:[ \\t]*(.*)$`, "im"));
	return match?.[1]?.trim() ?? "";
}

function formatRfc5322Date(date: Date): string {
	return date.toUTCString().replace(/GMT$/, "+0000");
}

/**
 * A copy the outbound relay can actually hand off. The original sender stays
 * inside the attached message. The outer From and the SMTP MAIL FROM are the
 * mailbox, which is a domain this server is allowed to sign. Relaying the
 * original envelope instead is dropped downstream (SPF/DKIM/DMARC), and the
 * failure notice goes to the outside sender rather than back to us.
 */
export function buildForwardCopy(input: {
	mailbox: string;
	destination: string;
	originalFrom?: string;
	original: Uint8Array;
	now?: Date;
}): Uint8Array {
	const mailbox = normalizeForwardAddress(input.mailbox);
	const destination = normalizeForwardAddress(input.destination);
	const subject = safeHeader(headerValue(input.original, "subject")) || "(no subject)";
	const replyTo = input.originalFrom ? safeHeader(input.originalFrom) : "";
	const domain = mailbox.split("@")[1] || "localhost";
	const lines = [
		`From: ${mailbox}`,
		`To: ${destination}`,
		`Subject: ${subject}`,
		`Date: ${formatRfc5322Date(input.now ?? new Date())}`,
		`Message-ID: <${crypto.randomUUID()}@${domain}>`,
		"MIME-Version: 1.0",
		"Content-Type: message/rfc822",
		"Content-Disposition: inline",
		"X-Mailflare-Forwarded: 1",
		"Auto-Submitted: auto-forwarded",
		`X-Original-To: ${mailbox}`,
	];
	if (replyTo) lines.push(`Reply-To: ${replyTo}`);
	const head = new TextEncoder().encode(`${lines.join("\r\n")}\r\n\r\n`);
	const out = new Uint8Array(head.length + input.original.length);
	out.set(head, 0);
	out.set(input.original, head.length);
	return out;
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
