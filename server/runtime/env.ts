import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBlobStore } from "./blob-store";
import { openMailer, type Mailer, type MailerConfig } from "./mailer";
import { openAssets, openRateLimiter } from "./misc";
import { openMongoClient } from "./mongo";
import { openQueue, type InProcessQueue } from "./queue";
import { RealtimeHubRegistry } from "./realtime";
import { openSqliteDatabase, type SqliteDatabase } from "./sqlite-database";
import type { NodeRuntime } from "./types";

function optional(name: string): string | undefined {
	const value = process.env[name]?.trim();
	return value || undefined;
}

function mailerConfig(): MailerConfig {
	const smtp = optional("SMTP_URL");
	if (smtp) return { kind: "smtp", url: smtp };
	return { kind: "none" };
}

/**
 * Assemble a `CloudflareEnv` for the Node runtime from environment variables
 * and local resources. Everything the app reaches through `getEnv()` is here,
 * so application code does not know which platform it runs on.
 *
 * MongoDB is opened asynchronously via {@link finalizeNodeRuntimeMongo} so the
 * sync bootstrap path stays unchanged for installs without MONGO_URL.
 */
export function createNodeRuntime(): NodeRuntime {
	const dataDir = resolve(optional("DATA_DIR") ?? "./data");
	mkdirSync(join(dataDir, "blobs"), { recursive: true });

	const database = openSqliteDatabase(join(dataDir, "mailflare.sqlite"));
	const blobStore = openBlobStore(dataDir);
	const bucket = blobStore.bucket;
	const mailer = openMailer(mailerConfig());
	const inboundQueue = openQueue("mailflare-inbound");
	const outboundQueue = openQueue("mailflare-outbound");
	const agentQueue = openQueue("mailflare-agent");
	const realtime = new RealtimeHubRegistry();
	const publicDir = resolve(optional("PUBLIC_DIR") ?? "./public");

	const env = {
		DB: database,
		BUCKET: bucket,
		EMAIL: mailer,
		INBOUND_QUEUE: inboundQueue,
		OUTBOUND_QUEUE: outboundQueue,
		AGENT_QUEUE: agentQueue,
		AI_MODEL: optional("AI_MODEL"),
		AI_BASE_URL: optional("AI_BASE_URL"),
		AI_API_KEY: optional("AI_API_KEY"),
		REALTIME: realtime.namespace(),
		ASSETS: openAssets(publicDir),
		IMAGES: undefined as unknown as CloudflareEnv["IMAGES"],
		WORKER_SELF_REFERENCE: undefined as unknown as CloudflareEnv["WORKER_SELF_REFERENCE"],
		LOGIN_RATE_LIMIT: openRateLimiter(20, 60),
		AGENT_RATE_LIMIT: openRateLimiter(120, 60),
		// Marks the runtime for the few places that must behave differently.
		MAILFLARE_RUNTIME: "node",
		APP_URL: optional("APP_URL")?.replace(/\/$/, ""),
		INBOUND_WEBHOOK_SECRET: optional("INBOUND_WEBHOOK_SECRET"),
		MONGO_URL: optional("MONGO_URL"),
		MONGO: null,
		SAAS_MODE: optional("SAAS_MODE"),
	} as unknown as CloudflareEnv;
	realtime.bindEnv(env);

	return {
		env,
		dataDir,
		database: database as unknown as SqliteDatabase,
		mailer: mailer as unknown as Mailer,
		inboundQueue: inboundQueue as unknown as InProcessQueue,
		outboundQueue: outboundQueue as unknown as InProcessQueue,
		agentQueue: agentQueue as unknown as InProcessQueue,
		realtime,
		blobStore,
	};
}

/** Connect Mongo when MONGO_URL is set and attach it to the runtime env. */
export async function finalizeNodeRuntimeMongo(runtime: NodeRuntime): Promise<void> {
	const url = runtime.env.MONGO_URL?.trim();
	if (!url) return;
	const mongo = await openMongoClient(url);
	(runtime.env as { MONGO: typeof mongo }).MONGO = mongo;
}
