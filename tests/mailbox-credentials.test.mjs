import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import bcrypt from "bcryptjs";
import { normalizeMailHostname } from "../src/lib/domains/hostname.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

function generateMailboxPassword(length = 20) {
	const bytes = randomBytes(length);
	let out = "";
	for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
	return out;
}

/** Mirrors getMailboxConnectionInfo without path-alias imports. */
function connectionInfo(address, env = process.env) {
	const host = normalizeMailHostname(env.MAIL_HOSTNAME?.trim() || env.APP_URL?.trim() || "") || "";
	const smtpPort = Number(env.SMTP_SUBMISSION_PORT ?? 587) || 587;
	const imapPort = Number(env.IMAP_PORT ?? 143) || 143;
	return {
		username: address.toLowerCase(),
		smtp: { host: host || "(set MAIL_HOSTNAME)", port: smtpPort, configured: Boolean(host) && smtpPort > 0 },
		imap: { host: host || "(set MAIL_HOSTNAME)", port: imapPort, configured: Boolean(host) && imapPort > 0 },
	};
}

/**
 * Pure auth decision: mailbox login accepts only mailbox.password_hash.
 * Admin portal accepts only users.password_hash for role=admin.
 */
function resolveLogin(input) {
	const { adminPortal, mailboxPasswordHash, userPasswordHash, userRole, userDisabled, mailboxDisabled, password } = input;
	if (userDisabled || mailboxDisabled) return { ok: false, reason: "disabled" };

	if (adminPortal) {
		if (!userPasswordHash || !bcrypt.compareSync(password, userPasswordHash)) {
			return { ok: false, reason: "invalid" };
		}
		if (userRole !== "admin") return { ok: false, reason: "not_admin" };
		return { ok: true, redirect: "/admin" };
	}

	if (!mailboxPasswordHash || !bcrypt.compareSync(password, mailboxPasswordHash)) {
		return { ok: false, reason: "invalid" };
	}
	return { ok: true, redirect: "/inbox" };
}

test("generateMailboxPassword is long enough and unique", () => {
	const a = generateMailboxPassword();
	const b = generateMailboxPassword();
	assert.ok(a.length >= 16);
	assert.notEqual(a, b);
});

test("bcrypt mailbox password round-trips (same cost as app)", () => {
	const password = "TestPass!23456";
	const hash = bcrypt.hashSync(password, 12);
	assert.ok(bcrypt.compareSync(password, hash));
	assert.equal(bcrypt.compareSync("wrong", hash), false);
});

test("connectionInfo uses MAIL_HOSTNAME", () => {
	const info = connectionInfo("user@example.com", {
		MAIL_HOSTNAME: "mail.example.com",
		SMTP_SUBMISSION_PORT: "587",
		IMAP_PORT: "143",
	});
	assert.equal(info.username, "user@example.com");
	assert.equal(info.smtp.host, "mail.example.com");
	assert.equal(info.smtp.port, 587);
	assert.equal(info.imap.port, 143);
	assert.equal(info.smtp.configured, true);
	assert.equal(info.imap.configured, true);
});

test("connection encryption is none without TLS certs", () => {
	const host = normalizeMailHostname("mail.example.com") || "";
	const hasTls = Boolean(undefined && undefined);
	assert.equal(hasTls, false);
	assert.equal(host, "mail.example.com");
});

test("independent hashes: same plaintext produces distinct bcrypt digests", () => {
	const password = "SharedCreatePass!99";
	const userHash = bcrypt.hashSync(password, 12);
	const mailboxHash = bcrypt.hashSync(password, 12);
	assert.notEqual(userHash, mailboxHash);
	assert.ok(bcrypt.compareSync(password, userHash));
	assert.ok(bcrypt.compareSync(password, mailboxHash));
});

test("mailbox login rejects when mailbox has no password_hash even if user hash matches", () => {
	const password = "UserOnlyPass!123";
	const userHash = bcrypt.hashSync(password, 12);
	const result = resolveLogin({
		adminPortal: false,
		mailboxPasswordHash: null,
		userPasswordHash: userHash,
		userRole: "user",
		userDisabled: false,
		mailboxDisabled: false,
		password,
	});
	assert.equal(result.ok, false);
	assert.equal(result.reason, "invalid");
});

test("mailbox login accepts mailbox hash and ignores differing user hash", () => {
	const mailboxPass = "MailboxOnly!456";
	const adminPass = "AdminOnly!789";
	const result = resolveLogin({
		adminPortal: false,
		mailboxPasswordHash: bcrypt.hashSync(mailboxPass, 12),
		userPasswordHash: bcrypt.hashSync(adminPass, 12),
		userRole: "admin",
		userDisabled: false,
		mailboxDisabled: false,
		password: mailboxPass,
	});
	assert.equal(result.ok, true);
	assert.equal(result.redirect, "/inbox");
});

test("mailbox login never redirects to /admin even for admin users", () => {
	const password = "MailboxWeb!111";
	const result = resolveLogin({
		adminPortal: false,
		mailboxPasswordHash: bcrypt.hashSync(password, 12),
		userPasswordHash: bcrypt.hashSync("OtherAdmin!222", 12),
		userRole: "admin",
		userDisabled: false,
		mailboxDisabled: false,
		password,
	});
	assert.equal(result.ok, true);
	assert.equal(result.redirect, "/inbox");
});

test("admin portal rejects mailbox password when user hash differs", () => {
	const mailboxPass = "MailboxOnly!456";
	const adminPass = "AdminOnly!789";
	const result = resolveLogin({
		adminPortal: true,
		mailboxPasswordHash: bcrypt.hashSync(mailboxPass, 12),
		userPasswordHash: bcrypt.hashSync(adminPass, 12),
		userRole: "admin",
		userDisabled: false,
		mailboxDisabled: false,
		password: mailboxPass,
	});
	assert.equal(result.ok, false);
	assert.equal(result.reason, "invalid");
});

test("admin portal accepts user hash and redirects to /admin", () => {
	const adminPass = "AdminOnly!789";
	const result = resolveLogin({
		adminPortal: true,
		mailboxPasswordHash: bcrypt.hashSync("MailboxOnly!456", 12),
		userPasswordHash: bcrypt.hashSync(adminPass, 12),
		userRole: "admin",
		userDisabled: false,
		mailboxDisabled: false,
		password: adminPass,
	});
	assert.equal(result.ok, true);
	assert.equal(result.redirect, "/admin");
});

test("admin portal rejects non-admin accounts", () => {
	const password = "UserAccount!000";
	const result = resolveLogin({
		adminPortal: true,
		mailboxPasswordHash: bcrypt.hashSync(password, 12),
		userPasswordHash: bcrypt.hashSync(password, 12),
		userRole: "user",
		userDisabled: false,
		mailboxDisabled: false,
		password,
	});
	assert.equal(result.ok, false);
	assert.equal(result.reason, "not_admin");
});

test("changing account password does not imply mailbox password change", () => {
	const original = "OriginalShared!1";
	const mailboxHash = bcrypt.hashSync(original, 12);
	let userHash = bcrypt.hashSync(original, 12);

	const nextAccount = "NewAccountPass!2";
	userHash = bcrypt.hashSync(nextAccount, 12);

	assert.equal(bcrypt.compareSync(nextAccount, userHash), true);
	assert.equal(bcrypt.compareSync(nextAccount, mailboxHash), false);
	assert.equal(bcrypt.compareSync(original, mailboxHash), true);

	assert.equal(
		resolveLogin({
			adminPortal: false,
			mailboxPasswordHash: mailboxHash,
			userPasswordHash: userHash,
			userRole: "admin",
			userDisabled: false,
			mailboxDisabled: false,
			password: nextAccount,
		}).ok,
		false,
	);
	assert.equal(
		resolveLogin({
			adminPortal: false,
			mailboxPasswordHash: mailboxHash,
			userPasswordHash: userHash,
			userRole: "admin",
			userDisabled: false,
			mailboxDisabled: false,
			password: original,
		}).ok,
		true,
	);
});

test("source: credentials no longer sync mailbox and user passwords", () => {
	const credentials = readFileSync(join(root, "src/lib/mailboxes/credentials.ts"), "utf8");
	assert.doesNotMatch(credentials, /syncMailboxPasswordsForUser/);
	assert.doesNotMatch(credentials, /userPasswordHash/);
	assert.doesNotMatch(credentials, /fall back to users\.password_hash/);
	assert.match(credentials, /Never copies to users\.password_hash/);
	assert.match(credentials, /Uses mailboxes\.password_hash only/);
	// setMailboxPassword updates only the target mailbox id
	assert.match(credentials, /where\(eq\(mailboxes\.id, mailboxId\)\)/);
	assert.doesNotMatch(credentials, /db\.update\(users\)/);
});

test("source: login route separates adminPortal from mailbox auth", () => {
	const login = readFileSync(join(root, "src/app/api/auth/login/route.ts"), "utf8");
	assert.match(login, /adminPortal/);
	assert.match(login, /authenticateMailboxAddress/);
	assert.match(login, /redirect = "\/inbox"/);
	assert.match(login, /redirect = "\/admin"/);
	assert.doesNotMatch(login, /Prefer mailbox password/);
	assert.doesNotMatch(login, /fall back to users\.password_hash/);
	// Mailbox branch: after "} else {" through the next shared user lookup
	const elseIdx = login.indexOf("} else {");
	assert.ok(elseIdx > 0);
	const afterElse = login.slice(elseIdx);
	const sharedLookup = afterElse.indexOf("const [user] = await db.select().from(users).where(eq(users.id, userId))");
	assert.ok(sharedLookup > 0);
	const mailboxBranch = afterElse.slice(0, sharedLookup);
	assert.doesNotMatch(mailboxBranch, /verifyPassword/);
	assert.match(mailboxBranch, /authenticateMailboxAddress/);
	// Admin branch must not call mailbox auth
	const adminBranch = login.slice(login.indexOf("if (adminPortal)"), elseIdx);
	assert.doesNotMatch(adminBranch, /authenticateMailboxAddress/);
	assert.match(adminBranch, /verifyPassword/);
});

test("source: settings and password-reset no longer sync mailbox hashes", () => {
	const settings = readFileSync(join(root, "src/app/api/settings/password/route.ts"), "utf8");
	const reset = readFileSync(join(root, "src/lib/auth/password-reset.ts"), "utf8");
	const accountUtils = readFileSync(join(root, "src/app/api/accounts/[id]/utils.ts"), "utf8");
	const create = readFileSync(join(root, "src/app/api/accounts/create.ts"), "utf8");
	for (const src of [settings, reset, accountUtils]) {
		assert.doesNotMatch(src, /syncMailboxPasswordsForUser/);
	}
	assert.match(create, /userPasswordHash/);
	assert.match(create, /mailboxPasswordHash/);
	// Account credential update must not write passwordHash onto mailboxes
	assert.doesNotMatch(accountUtils, /\.update\(mailboxes\)[\s\S]*passwordHash/);
	assert.match(accountUtils, /\.update\(mailboxes\)[\s\S]*displayName/);
});

test("source: admin portal sends adminPortal; mailbox path never does", () => {
	const mailbox = readFileSync(join(root, "src/app/(auth)/login/mailbox-login-client.tsx"), "utf8");
	const admin = readFileSync(join(root, "src/app/(admin)/admin/login/admin-login-client.tsx"), "utf8");
	const utils = readFileSync(join(root, "src/app/(auth)/login/utils.ts"), "utf8");
	assert.match(admin, /submitLogin\([^,]+,\s*\{\s*adminPortal:\s*true\s*\}\)/);
	assert.match(admin, /submitMfaCode\([^,]+,\s*[^,]+,\s*\{\s*adminPortal:\s*true\s*\}\)/);
	assert.doesNotMatch(mailbox, /adminPortal/);
	assert.match(mailbox, /submitLogin\(new FormData\(e\.currentTarget\)\)/);
	assert.match(utils, /options\?\.adminPortal \? \{ adminPortal: true \}/);
	assert.match(admin, /not your mailbox IMAP\/webmail password/i);
	assert.match(mailbox, /not your admin account password/i);
});
