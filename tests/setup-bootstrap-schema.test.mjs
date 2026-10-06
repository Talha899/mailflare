import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("migration bundle includes mailbox password hash and organization migrations", () => {
	const bundle = JSON.parse(
		readFileSync(join(root, "src/lib/migrations/bundle.json"), "utf8"),
	);
	const names = bundle.migrations.map((item) => item.name);
	for (const name of [
		"0013_add_license_settings.sql",
		"0021_add_mailbox_signature.sql",
		"0022_add_mailbox_auto_reply.sql",
		"0027_add_domain_sending_intent.sql",
		"0029_add_spam_protection.sql",
		"0051_add_organization_id.sql",
		"0052_add_mailbox_password_hash.sql",
	]) {
		assert.ok(names.includes(name), `bundle is missing ${name}`);
	}
});

test("setup migrateCleanDatabase delegates to the shared migration runner", () => {
	const src = readFileSync(join(root, "src/lib/setup/migration.ts"), "utf8");
	assert.match(src, /applyPendingMigrations/);
	assert.match(src, /migrateCleanDatabase/);
});

test("mailbox schema includes password_hash for IMAP/SMTP AUTH", () => {
	const schema = readFileSync(join(root, "src/db/schema/index.ts"), "utf8");
	assert.match(schema, /passwordHash:\s*text\("password_hash"\)/);
	const migration = readFileSync(
		join(root, "drizzle/migrations/0052_add_mailbox_password_hash.sql"),
		"utf8",
	);
	assert.match(migration, /ADD `password_hash` text/i);
});
