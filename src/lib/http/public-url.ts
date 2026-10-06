/**
 * Guard for server-side requests to user-supplied URLs (webhooks). Without it
 * a webhook could target 127.0.0.1, the Docker network or a cloud metadata
 * endpoint, and the stored response snippet would read the answer back.
 */

export function ipv4Parts(host: string): number[] | null {
	const parts = host.split(".");
	if (parts.length !== 4) return null;
	const numbers = parts.map((part) => (/^\d{1,3}$/.test(part) ? Number(part) : NaN));
	return numbers.every((value) => value >= 0 && value <= 255) ? numbers : null;
}

/** Loopback, private, link-local, CGNAT, multicast and reserved ranges. */
export function isPrivateAddress(address: string): boolean {
	const host = address.replace(/^\[|\]$/g, "").toLowerCase();
	const v4 = ipv4Parts(host.startsWith("::ffff:") ? host.slice(7) : host);
	if (v4) {
		const [a, b] = v4;
		return (
			a === 0 ||
			a === 10 ||
			a === 127 ||
			(a === 100 && b >= 64 && b <= 127) ||
			(a === 169 && b === 254) ||
			(a === 172 && b >= 16 && b <= 31) ||
			(a === 192 && b === 168) ||
			(a === 192 && b === 0) ||
			(a === 198 && (b === 18 || b === 19)) ||
			a >= 224
		);
	}
	if (host.includes(":")) {
		return (
			host === "::" ||
			host === "::1" ||
			host.startsWith("fc") ||
			host.startsWith("fd") ||
			host.startsWith("fe8") ||
			host.startsWith("fe9") ||
			host.startsWith("fea") ||
			host.startsWith("feb") ||
			host.startsWith("ff")
		);
	}
	return false;
}

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal", "metadata"]);

/** Cheap checks that need no DNS: scheme, credentials and literal private hosts. */
export function getPublicUrlProblem(raw: string): string | null {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return "Enter a valid URL";
	}
	if (url.protocol !== "https:" && url.protocol !== "http:") return "Use an http or https URL";
	if (url.username || url.password) return "URLs with credentials are not allowed";
	const host = url.hostname.toLowerCase();
	if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
		return "Webhooks must point to a public address";
	}
	if (isPrivateAddress(host)) return "Webhooks must point to a public address";
	return null;
}
