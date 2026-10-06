import { getPublicUrlProblem, ipv4Parts, isPrivateAddress } from "./public-url";

/**
 * Full check before a request is sent. On Node the hostname is resolved and
 * every address must be public (Workers cannot reach private ranges anyway and
 * have no resolver, so the DNS step is skipped there).
 */
export async function assertPublicUrl(raw: string): Promise<void> {
	const problem = getPublicUrlProblem(raw);
	if (problem) throw new Error(problem);
	if (typeof process === "undefined" || !process.versions?.node || process.env.MAILFLARE_RUNTIME !== "node") return;
	const hostname = new URL(raw).hostname.replace(/^\[|\]$/g, "");
	if (ipv4Parts(hostname) || hostname.includes(":")) return;
	const { lookup } = await import("node:dns/promises");
	const addresses = await lookup(hostname, { all: true });
	if (addresses.length === 0 || addresses.some((entry) => isPrivateAddress(entry.address))) {
		throw new Error("Webhooks must point to a public address");
	}
}
