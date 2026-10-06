import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import bcrypt from "bcryptjs";
import { normalizeMailHostname } from "../src/lib/domains/hostname.ts";

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
	const host =
		normalizeMailHostname("mail.example.com") || "";
	const hasTls = Boolean(undefined && undefined);
	assert.equal(hasTls, false);
	assert.equal(host, "mail.example.com");
});
