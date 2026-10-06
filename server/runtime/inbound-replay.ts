import { inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { messages } from "@/db/schema";
import { getEmailAddress } from "@/lib/email/address";
import type { InboundQueueMessage } from "@/lib/email/inbound";

const INBOUND_PREFIX = "inbound/";
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Inbound MIME is written to object storage before the in-memory queue runs.
 * If ingest crashes (or the process restarts), those objects stay unprocessed.
 * Re-enqueue anything still on disk that has no messages row.
 */
export async function replayUnprocessedInbound(env: CloudflareEnv): Promise<number> {
	let listed: { key: string; uploaded: Date }[];
	try {
		listed = await listInboundObjects(env.BUCKET);
	} catch (error) {
		console.warn("Inbound replay skipped: object listing failed", error);
		return 0;
	}

	const now = Date.now();
	const keys = listed
		.filter((object) => object.key.endsWith(".eml") && now - object.uploaded.getTime() <= MAX_AGE_MS)
		.map((object) => object.key);
	if (!keys.length) return 0;

	const processed = await loadProcessedKeys(env, keys);
	let queued = 0;
	for (const key of keys) {
		if (processed.has(key)) continue;
		const envelope = await readEnvelope(env, key);
		if (!envelope?.to) {
			console.warn(`Inbound replay skipped ${key}: missing recipient metadata`);
			continue;
		}
		const payload: InboundQueueMessage = { from: envelope.from, to: envelope.to, rawR2Key: key };
		await env.INBOUND_QUEUE.send(payload);
		queued += 1;
		console.log(`Inbound replay queued ${key} for ${envelope.to}`);
	}
	if (queued) console.log(`Inbound replay: queued ${queued} unprocessed message(s)`);
	return queued;
}

async function listInboundObjects(bucket: R2Bucket): Promise<{ key: string; uploaded: Date }[]> {
	const objects: { key: string; uploaded: Date }[] = [];
	let cursor: string | undefined;
	do {
		const page = await bucket.list({ prefix: INBOUND_PREFIX, cursor, limit: 1000 });
		for (const object of page.objects) {
			objects.push({ key: object.key, uploaded: object.uploaded });
		}
		cursor = page.truncated ? page.cursor : undefined;
	} while (cursor);
	return objects;
}

async function loadProcessedKeys(env: CloudflareEnv, keys: string[]): Promise<Set<string>> {
	const db = getDb(env);
	const processed = new Set<string>();
	const chunkSize = 400;
	for (let i = 0; i < keys.length; i += chunkSize) {
		const chunk = keys.slice(i, i + chunkSize);
		const rows = await db
			.select({ rawR2Key: messages.rawR2Key })
			.from(messages)
			.where(inArray(messages.rawR2Key, chunk));
		for (const row of rows) {
			if (row.rawR2Key) processed.add(row.rawR2Key);
		}
	}
	return processed;
}

async function readEnvelope(env: CloudflareEnv, key: string): Promise<{ from: string; to: string } | null> {
	const head = await env.BUCKET.head(key);
	const fromMeta = head?.customMetadata?.from ?? "";
	const toMeta = head?.customMetadata?.to ?? "";
	if (toMeta) return { from: fromMeta, to: toMeta };

	const object = await env.BUCKET.get(key);
	if (!object) return null;
	const raw = Buffer.from(await object.arrayBuffer());
	const headers = parseHeaderBlock(raw);
	const to =
		getEmailAddress(headers["delivered-to"] ?? "") ||
		getEmailAddress(headers["x-original-to"] ?? "") ||
		getEmailAddress(headers["envelope-to"] ?? "") ||
		getEmailAddress(headers.to ?? "");
	if (!to) return null;
	return { from: getEmailAddress(headers.from ?? "") || fromMeta, to };
}

function parseHeaderBlock(raw: Buffer): Record<string, string> {
	const text = raw.subarray(0, Math.min(raw.length, 64 * 1024)).toString("latin1");
	const end = text.search(/\r?\n\r?\n/);
	const block = (end >= 0 ? text.slice(0, end) : text).replace(/\r?\n[ \t]+/g, " ");
	const headers: Record<string, string> = {};
	for (const line of block.split(/\r?\n/)) {
		const index = line.indexOf(":");
		if (index <= 0) continue;
		const name = line.slice(0, index).trim().toLowerCase();
		if (!(name in headers)) headers[name] = line.slice(index + 1).trim();
	}
	return headers;
}
