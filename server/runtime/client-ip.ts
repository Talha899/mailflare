import type { IncomingMessage } from "node:http";

/**
 * The client address the app may trust. On Workers Cloudflare sets
 * cf-connecting-ip itself; on Node any client can send that header, which made
 * the login rate limit trivially bypassable. Off Workers the header is always
 * replaced with one of:
 *
 * - TRUSTED_CLIENT_IP_HEADER (e.g. "cf-connecting-ip" behind Cloudflare, or
 *   "x-real-ip" behind a proxy that sets it), when the operator names one;
 * - the Nth address from the right of X-Forwarded-For, for TRUST_PROXY_HOPS=N;
 * - otherwise the TCP peer address.
 */
export function resolveClientIp(request: IncomingMessage): string {
	const trustedHeader = process.env.TRUSTED_CLIENT_IP_HEADER?.trim().toLowerCase();
	if (trustedHeader) {
		const value = request.headers[trustedHeader];
		const first = (Array.isArray(value) ? value[0] : value)?.split(",")[0]?.trim();
		if (first) return first;
	}

	const hops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
	if (Number.isInteger(hops) && hops > 0) {
		const header = request.headers["x-forwarded-for"];
		const chain = (Array.isArray(header) ? header.join(",") : header ?? "")
			.split(",")
			.map((entry) => entry.trim())
			.filter(Boolean);
		// Each trusted proxy appends the address it saw; anything to the left of
		// those entries was written by the client and cannot be trusted.
		const candidate = chain[chain.length - hops];
		if (candidate) return candidate;
	}

	return request.socket.remoteAddress ?? "unknown";
}

/** Browsers always send Origin on WebSocket upgrades; it must name the host being connected to. */
export function isSameHostWebSocketOrigin(origin: string | undefined, host: string | undefined): boolean {
	if (!origin || !host) return false;
	try {
		return new URL(origin).host === host;
	} catch {
		return false;
	}
}

/** Overwrite the client-IP header every route reads, before Next sees the request. */
export function applyTrustedClientIp(request: IncomingMessage): void {
	request.headers["cf-connecting-ip"] = resolveClientIp(request);
}
