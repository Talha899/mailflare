import assert from "node:assert/strict";
import test from "node:test";
import { canAdministerOrganizationMailboxes } from "../src/lib/mailboxes/admin-scope.ts";

test("admin portal sessions can administer organization mailboxes", () => {
	assert.equal(canAdministerOrganizationMailboxes({ role: "admin", sessionScope: "admin" }), true);
	assert.equal(canAdministerOrganizationMailboxes({ role: "admin", sessionScope: "account" }), true);
});

test("webmail and plain users cannot administer organization mailboxes", () => {
	assert.equal(canAdministerOrganizationMailboxes({ role: "admin", sessionScope: "mailbox" }), false);
	assert.equal(canAdministerOrganizationMailboxes({ role: "user", sessionScope: "admin" }), false);
	assert.equal(canAdministerOrganizationMailboxes({ role: "user", sessionScope: "mailbox" }), false);
});
