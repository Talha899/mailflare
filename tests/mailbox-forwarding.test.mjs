import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { deliverCopyForwards, prependRawHeaders, uniqueForwardDestinations } from "../src/lib/email/forward-destinations.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
	return readFileSync(join(root, path), "utf8");
}

test("copy destinations skip the mailbox itself and duplicates", () => {
	assert.deepEqual(
		uniqueForwardDestinations(
			[" Archive@Example.com ", "owner@example.com", "archive@example.com", "  ", null],
			["user@example.com", "User <user@example.com>"],
		),
		["Archive@Example.com", "owner@example.com"],
	);
	assert.deepEqual(
		uniqueForwardDestinations(["user@example.com", "other@example.com"], ["user@example.com"]),
		["other@example.com"],
	);
});

test("forwarded raw mail carries the loop header", () => {
	const raw = new TextEncoder().encode("From: a@example.com\r\n\r\nHello");
	const next = new TextDecoder().decode(prependRawHeaders(raw, { "X-Mailflare-Forwarded": "1" }));
	assert.match(next, /^X-Mailflare-Forwarded: 1\r\nFrom: a@example.com/);
	assert.equal(prependRawHeaders(raw, { "X-Test": "  " }), raw);
});

test("mailbox forwarding is stored on the mailbox and migrated", () => {
	assert.match(read("src/db/schema/index.ts"), /forwardingEmail:\s*text\("forwarding_email"\)/);
	const migration = read("drizzle/migrations/0055_add_mailbox_forwarding_email.sql");
	assert.match(migration, /ALTER TABLE `mailboxes` ADD `forwarding_email` text/);
	const journal = JSON.parse(read("drizzle/migrations/meta/_journal.json"));
	assert.ok(journal.entries.some((entry) => entry.tag === "0055_add_mailbox_forwarding_email"));
});

test("only an admin console session can read or set mailbox forwarding", () => {
	const route = read("src/app/api/mailboxes/[id]/forwarding/route.ts");
	assert.match(route, /canAdministerOrganizationMailboxes/);
	assert.match(route, /mailbox\.forwarding_update/);
	assert.match(route, /A mailbox cannot forward to itself/);
	const adminPage = read("src/app/(admin)/admin/(console)/mailboxes/[id]/page.tsx");
	assert.match(adminPage, /MailboxForwardingForm/);
});

test("webmail mailbox payloads do not include the forward address", () => {
	for (const path of [
		"src/app/api/mailboxes/[id]/utils.ts",
		"src/lib/mailboxes/access.ts",
		"src/app/api/v1/mailboxes/[id]/utils.ts",
		"src/app/api/v1/mailboxes/utils.ts",
		"src/components/settings/account-settings.tsx",
		"src/components/settings/utils.ts",
	]) {
		assert.doesNotMatch(read(path), /mailboxes\.forwardingEmail|\/api\/mailboxes\/[^"'`]+\/forwarding/, path);
	}
});

test("one failed copy does not stop the other copies", async () => {
	const sent = [];
	await deliverCopyForwards("user@example.com", ["down@example.com", "archive@example.com"], async (destination) => {
		if (destination.startsWith("down@")) throw new Error("relay refused");
		sent.push(destination);
		return true;
	});
	assert.deepEqual(sent, ["archive@example.com"]);
});

test("forwarding migration adds a nullable column to an existing mailboxes table", () => {
	const db = new Database(":memory:");
	db.exec("CREATE TABLE mailboxes (id text primary key)");
	const sql = read("drizzle/migrations/0055_add_mailbox_forwarding_email.sql").replace(/^\s*--.*$/gm, "").trim();
	db.exec(sql);
	const column = db.prepare("PRAGMA table_info(mailboxes)").all().find((item) => item.name === "forwarding_email");
	assert.ok(column);
	assert.equal(column.notnull, 0);
	db.close();
});

test("stored mail is copied from both inbound runtimes", () => {
	assert.match(read("worker.ts"), /deliverCopyForwards/);
	assert.match(read("src/lib/email/intake.ts"), /deliverCopyForwards/);
	assert.match(read("src/lib/email/account-forwarding.ts"), /Copy forward lookup failed/);
	assert.match(read("src/app/api/mailboxes/[id]/forwarding/route.ts"), /status: 401/);
	const smtp = read("server/runtime/smtp.ts");
	assert.match(smtp, /prependRawHeaders/);
	assert.match(smtp, /headers/);
});
