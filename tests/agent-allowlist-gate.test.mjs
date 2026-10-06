import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bundleDirectory = mkdtempSync(join(root, "node_modules", "mailflare-agent-bundle-gate-"));
await build({
	stdin: {
		contents: `
			export { SqliteDatabase } from "./server/runtime/sqlite-database.ts";
			export { applyMigrations } from "./server/runtime/migrate.ts";
			export { createAgentChatStream } from "./src/lib/agent/chat.ts";
			export { isMailboxAgentEnabled, isAssistantAvailableForMailbox } from "./src/lib/agent/provider.ts";
		`,
		resolveDir: root,
		sourcefile: "agent-allowlist-gate-entry.ts",
	},
	outfile: join(bundleDirectory, "entry.mjs"),
	bundle: true,
	platform: "node",
	format: "esm",
	target: "node24",
	tsconfig: join(root, "tsconfig.json"),
	packages: "external",
	alias: {
		"next/headers": "next/headers.js",
		"cloudflare:workers": "./server/runtime/cloudflare-workers.ts",
	},
	logLevel: "silent",
});
const {
	SqliteDatabase,
	applyMigrations,
	createAgentChatStream,
	isMailboxAgentEnabled,
	isAssistantAvailableForMailbox,
} = await import(pathToFileURL(join(bundleDirectory, "entry.mjs")).href);

test("mailbox allowlist gates chat when settings row is missing or disabled", async (t) => {
	const directory = mkdtempSync(join(tmpdir(), "mailflare-gate-"));
	const database = new SqliteDatabase(join(directory, "mailflare.sqlite"));
	t.after(() => {
		try { database.db.close(); } catch { /* already closed */ }
		try { rmSync(directory, { recursive: true, force: true }); } catch { /* Windows may keep a brief lock */ }
		try { rmSync(bundleDirectory, { recursive: true, force: true }); } catch { /* best-effort */ }
	});
	await applyMigrations(database, join(process.cwd(), "drizzle", "migrations"));
	database.db.exec(`
		INSERT INTO users (id, email, password_hash, name, created_at) VALUES ('user-1', 'owner@example.com', 'hash', 'Owner', 1);
		INSERT INTO domains (id, user_id, hostname, zone_id, status, created_at) VALUES ('domain-1', 'user-1', 'example.com', 'zone-1', 'active', 1);
		INSERT INTO mailboxes (id, user_id, domain_id, local_part, created_at) VALUES ('mailbox-1', 'user-1', 'domain-1', 'owner', 1);
	`);
	const server = createServer((_request, response) => {
		response.writeHead(200, { "Content-Type": "text/event-stream" });
		response.end("data: [DONE]\n\n");
	});
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	t.after(() => server.close());
	const env = {
		DB: database,
		BUCKET: { get: async () => null, delete: async () => {} },
		AI_BASE_URL: `http://127.0.0.1:${server.address().port}/v1`,
		AI_API_KEY: "test-key",
		AI_MODEL: "test-model",
	};
	const context = { env, user: { id: "user-1", email: "owner@example.com", role: "user" }, mailboxId: "mailbox-1", origin: "chat" };

	assert.equal(await isMailboxAgentEnabled(env, "mailbox-1"), false);
	assert.equal(await isAssistantAvailableForMailbox(env, "mailbox-1"), false);
	await assert.rejects(() => createAgentChatStream(context, "hi"), /not available/);

	database.db.exec(`
		INSERT INTO mailbox_agent_settings (mailbox_id, enabled, auto_draft_enabled, instructions, daily_limit, updated_at)
		VALUES ('mailbox-1', 1, 0, '', 25, 1);
	`);
	assert.equal(await isMailboxAgentEnabled(env, "mailbox-1"), true);
	assert.equal(await isAssistantAvailableForMailbox(env, "mailbox-1"), true);
});
