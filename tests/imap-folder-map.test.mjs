import assert from "node:assert/strict";
import test from "node:test";

/** Mirrors server/runtime/imap/store SYSTEM_FOLDERS without importing DB code. */
const SYSTEM_FOLDERS = [
	{ name: "INBOX", status: "received" },
	{ name: "Sent", status: "sent" },
	{ name: "Drafts", status: "draft" },
	{ name: "Trash", status: "trash" },
	{ name: "Junk", status: "spam" },
	{ name: "Archive", status: "archived" },
];

function quoteImapString(value) {
	return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

test("SYSTEM_FOLDERS includes INBOX and Sent", () => {
	assert.ok(SYSTEM_FOLDERS.some((f) => f.name === "INBOX"));
	assert.ok(SYSTEM_FOLDERS.some((f) => f.name === "Sent" && f.status === "sent"));
});

test("quoteImapString escapes quotes", () => {
	assert.equal(quoteImapString('a"b'), '"a\\"b"');
});

function stableImapUid(messageId) {
	let hash = 2166136261;
	for (let i = 0; i < messageId.length; i++) {
		hash ^= messageId.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0) % 2147483646 + 1;
}

test("stableImapUid is stable and positive", () => {
	const a = stableImapUid("msg_abc");
	const b = stableImapUid("msg_abc");
	const c = stableImapUid("msg_xyz");
	assert.equal(a, b);
	assert.notEqual(a, c);
	assert.ok(a >= 1 && a <= 2147483646);
});
