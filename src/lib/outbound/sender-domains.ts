import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { domains } from "@/db/schema";
import { getDb } from "@/db";

import { normalizeDomainHostname } from "@/lib/domains/hostname";
import { parseOpenDkimPublicTxt } from "@/lib/outbound/dkim-txt-utils";

/** Shared with the Postfix container (`deploy/postfix`) via the mailflare-data volume. */
export const OUTBOUND_SENDER_DOMAINS_FILE = "outbound/sender-domains.txt";
export const OUTBOUND_DKIM_DIR = "outbound/dkim";
/** boky/postfix default selector when DKIM_SELECTOR is unset. */
export const OUTBOUND_DKIM_SELECTOR = "mail";

function dataDir(): string | null {
	const dir = process.env.DATA_DIR?.trim();
	return dir || null;
}

function opendkimKeysDir(): string | null {
	const dir = process.env.OPENDKIM_KEYS_DIR?.trim();
	return dir || null;
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
	const lines = [...new Set(hostnames.map(normalizeDomainHostname).filter(Boolean))].sort();
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

async function readPublishedDkimTxt(root: string, hostname: string): Promise<string | null> {
	try {
		const path = join(root, OUTBOUND_DKIM_DIR, `${normalizeDomainHostname(hostname)}.txt`);
		const content = (await readFile(path, "utf8")).trim();
		if (!content || content.startsWith("(")) return null;
		return content;
	} catch {
		return null;
	}
}

async function readOpenDkimKeyTxt(keysRoot: string, hostname: string): Promise<string | null> {
	const domain = normalizeDomainHostname(hostname);
	const selector = OUTBOUND_DKIM_SELECTOR;
	const candidates = [
		join(keysRoot, `${domain}.txt`),
		join(keysRoot, domain, `${selector}.txt`),
		join(keysRoot, domain, "mail.txt"),
		join(keysRoot, `${selector}.${domain}.txt`),
	];
	for (const path of candidates) {
		try {
			const raw = await readFile(path, "utf8");
			const parsed = parseOpenDkimPublicTxt(raw);
			if (parsed) return parsed;
		} catch {
			continue;
		}
	}
	return null;
}

async function cachePublishedDkim(root: string, hostname: string, content: string): Promise<void> {
	const domain = normalizeDomainHostname(hostname);
	const dir = join(root, OUTBOUND_DKIM_DIR);
	await mkdir(dir, { recursive: true });
	await writeFile(join(dir, `${domain}.txt`), `${content}\n`, "utf8");
}

/** Public DKIM TXT content written by deploy/postfix after key generation. */
export async function readOutboundDkimTxt(hostname: string): Promise<string | null> {
	const root = dataDir();
	if (root) {
		const published = await readPublishedDkimTxt(root, hostname);
		if (published) return published;
	}

	const keysRoot = opendkimKeysDir();
	if (keysRoot) {
		const fromKeys = await readOpenDkimKeyTxt(keysRoot, hostname);
		if (fromKeys && root) {
			try {
				await cachePublishedDkim(root, hostname, fromKeys);
			} catch (error) {
				console.warn("cachePublishedDkim", error);
			}
		}
		if (fromKeys) return fromKeys;
	}

	return null;
}

export type OutboundDkimStatus = {
	ready: boolean;
	hint: string;
};

/** Operator-facing reason when DKIM content is not paste-ready yet. */
export async function describeOutboundDkimStatus(hostname: string): Promise<OutboundDkimStatus> {
	const domain = normalizeDomainHostname(hostname);
	const content = await readOutboundDkimTxt(hostname);
	if (content) return { ready: true, hint: content };

	const root = dataDir();
	if (!root) {
		return {
			ready: false,
			hint: "DATA_DIR is not set on the Mailflare container — DKIM cannot be read from the Postfix volume.",
		};
	}

	if (!process.env.SMTP_URL?.trim()) {
		return {
			ready: false,
			hint: "Set SMTP_URL=smtp://postfix:587 and run the postfix service on the same Docker network.",
		};
	}

	let listed = false;
	try {
		const list = (await readFile(join(root, OUTBOUND_SENDER_DOMAINS_FILE), "utf8"))
			.split(/\r?\n/)
			.map((line) => normalizeDomainHostname(line.replace(/#.*$/, "")))
			.filter(Boolean);
		listed = list.includes(domain);
	} catch {
		return {
			ready: false,
			hint: "Postfix sync file missing. Deploy the postfix service with the shared mailflare-data volume, then refresh this page.",
		};
	}

	if (!listed) {
		return {
			ready: false,
			hint: `${domain} is not in outbound/sender-domains.txt yet — refresh details to sync, or restart Mailflare.`,
		};
	}

	if (!opendkimKeysDir()) {
		return {
			ready: false,
			hint: "Postfix has not published DKIM yet. Ensure the postfix container is running (same compose stack), wait ~60s after domain sync, then refresh. Mount postfix keys read-only on Mailflare (OPENDKIM_KEYS_DIR) for faster pickup.",
		};
	}

	return {
		ready: false,
		hint: "Postfix is syncing but no key file exists for this domain yet. Check postfix logs for OpenDKIM autogenerate errors, wait ~60s, then refresh.",
	};
}
