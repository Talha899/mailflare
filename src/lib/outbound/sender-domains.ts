import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { domains } from "@/db/schema";
import { getDb } from "@/db";

/** Shared with the Postfix container (`deploy/postfix`) via the mailflare-data volume. */
export const OUTBOUND_SENDER_DOMAINS_FILE = "outbound/sender-domains.txt";
export const OUTBOUND_DKIM_DIR = "outbound/dkim";
/** boky/postfix default selector when DKIM_SELECTOR is unset. */
export const OUTBOUND_DKIM_SELECTOR = "mail";

function dataDir(): string | null {
	const dir = process.env.DATA_DIR?.trim();
	return dir || null;
}

function normalizeHostname(hostname: string): string {
	return hostname.trim().toLowerCase().replace(/\.$/, "");
}

/**
 * Writes every registered domain hostname for the outbound MTA.
 * Postfix watches this file and provisions DKIM — no per-domain env vars.
 */
export async function writeOutboundSenderDomains(hostnames: string[]): Promise<void> {
	const root = dataDir();
	if (!root) return;
	const dir = join(root, "outbound");
	await mkdir(dir, { recursive: true });
	const lines = [...new Set(hostnames.map(normalizeHostname).filter(Boolean))].sort();
	await writeFile(join(root, OUTBOUND_SENDER_DOMAINS_FILE), `${lines.join("\n")}${lines.length ? "\n" : ""}`, "utf8");
}

/** Re-export the full domains table into the shared sender-domains file. */
export async function syncOutboundSenderDomains(env: CloudflareEnv): Promise<void> {
	if (!dataDir()) return;
	try {
		const db = getDb(env);
		const rows = await db.select({ hostname: domains.hostname }).from(domains);
		await writeOutboundSenderDomains(rows.map((row) => row.hostname));
	} catch (error) {
		console.warn("syncOutboundSenderDomains", error);
	}
}

/** Public DKIM TXT content written by deploy/postfix after key generation. */
export async function readOutboundDkimTxt(hostname: string): Promise<string | null> {
	const root = dataDir();
	if (!root) return null;
	try {
		const path = join(root, OUTBOUND_DKIM_DIR, `${normalizeHostname(hostname)}.txt`);
		const content = (await readFile(path, "utf8")).trim();
		return content || null;
	} catch {
		return null;
	}
}
