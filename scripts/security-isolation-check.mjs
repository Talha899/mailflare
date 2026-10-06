#!/usr/bin/env node
/**
 * End-to-end isolation checks against a running dev server (never production).
 *
 *   npm run dev            # or any local instance
 *   npm run db:seed        # demo user with support@ and billing@ on example.com
 *   BASE_URL=http://localhost:3000 node scripts/security-isolation-check.mjs
 *
 * On a fresh database it registers the first admin itself. Otherwise pass the
 * existing admin with ADMIN_EMAIL / ADMIN_PASSWORD.
 *
 * What it asserts:
 *   - a webmail session (mailbox password) sees only its own mailbox, even when
 *     the same account owns other mailboxes, and cannot send from them;
 *   - a webmail session never has admin rights, even for an admin's mailbox;
 *   - the admin portal refuses mailbox passwords and admins cannot read users' mail;
 *   - account-wide settings cannot be changed from a webmail session;
 *   - domain routing rules, mailbox creation and webhooks to private hosts are refused.
 */

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const ADMIN_DOMAIN = process.env.ADMIN_DOMAIN ?? "acme-test.com";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "owner";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? `${ADMIN_USERNAME}@${ADMIN_DOMAIN}`;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "owner-password-123";
const SUPPORT = "support@example.com";
const BILLING = "billing@example.com";

if (/codenak|\.prod|production/i.test(BASE)) {
	console.error(`Refusing to run against ${BASE}: this script creates accounts and changes passwords.`);
	process.exit(2);
}

let failures = 0;
let passes = 0;

function check(name, condition, detail = "") {
	if (condition) {
		passes += 1;
		console.log(`  ok   ${name}`);
	} else {
		failures += 1;
		console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
	}
}

/** A tiny cookie-carrying client; Origin is set so mutations pass the CSRF check. */
function client() {
	let cookie = "";
	async function call(path, { method = "GET", body, headers = {} } = {}) {
		const response = await fetch(`${BASE}${path}`, {
			method,
			redirect: "manual",
			headers: {
				Origin: BASE,
				"Sec-Fetch-Site": "same-origin",
				...(body !== undefined ? { "Content-Type": "application/json" } : {}),
				...(cookie ? { Cookie: cookie } : {}),
				...headers,
			},
			body: body !== undefined ? JSON.stringify(body) : undefined,
		});
		for (const setCookie of response.headers.getSetCookie?.() ?? []) {
			const [pair] = setCookie.split(";");
			if (pair.startsWith("ep_session=")) cookie = pair;
		}
		let json = null;
		const text = await response.text();
		try {
			json = text ? JSON.parse(text) : null;
		} catch {
			json = { raw: text.slice(0, 200) };
		}
		return { status: response.status, json };
	}
	return { call, hasSession: () => !!cookie };
}

async function login(email, password, adminPortal = false) {
	const session = client();
	const result = await session.call("/api/auth/login", { method: "POST", body: { email, password, adminPortal } });
	return { session, result };
}

async function main() {
	console.log(`Isolation checks against ${BASE}\n`);

	// ── Setup ────────────────────────────────────────────────────────────────
	const status = await client().call("/api/setup/status");
	if (status.json?.hasAdminAccount === false) {
		const registered = await client().call("/api/auth/register", {
			method: "POST",
			body: { domain: ADMIN_DOMAIN, username: ADMIN_USERNAME, password: ADMIN_PASSWORD, resetEmail: "owner-recovery@example.org" },
		});
		if (registered.status >= 400) {
			console.error("Could not register the first admin:", registered.status, registered.json);
			process.exit(1);
		}
	}

	const admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD, true);
	if (admin.result.status !== 200) {
		console.error("Admin portal login failed; set ADMIN_EMAIL/ADMIN_PASSWORD.", admin.result.status, admin.result.json);
		process.exit(1);
	}
	const adminApi = admin.session.call;

	// Mailbox ids come from the local database: without a Team license the admin
	// API only lists the admin's own mailboxes, which is itself part of the design.
	const ids = {};
	const { default: Database } = await import("better-sqlite3");
	const { join, resolve } = await import("node:path");
	const database = new Database(join(resolve(process.env.DATA_DIR ?? "./data"), "mailflare.sqlite"), { readonly: true, fileMustExist: true });
	for (const row of database.prepare("SELECT m.id, m.local_part AS localPart, d.hostname FROM mailboxes m JOIN domains d ON d.id = m.domain_id").all()) {
		ids[`${row.localPart}@${row.hostname}`] = row.id;
	}
	database.close();

	const adminMailboxAddress = Object.keys(ids).find((address) => address.endsWith(`@${ADMIN_DOMAIN}`)) ?? ADMIN_EMAIL;
	if (!ids[SUPPORT] || !ids[BILLING]) {
		console.error("Seed mailboxes not found. Run `npm run db:seed` first.", Object.keys(ids));
		process.exit(1);
	}

	const passwords = { [SUPPORT]: "support-mailbox-pass-1", [BILLING]: "billing-mailbox-pass-1", [adminMailboxAddress]: "owner-mailbox-pass-1" };
	for (const [address, password] of Object.entries(passwords)) {
		const result = await adminApi(`/api/mailboxes/${ids[address]}/password`, { method: "POST", body: { password } });
		if (result.status !== 200) console.error(`Could not set the ${address} password`, result.status, result.json);
	}

	// ── Portal separation ───────────────────────────────────────────────────
	console.log("Portal separation");
	const supportLogin = await login(SUPPORT, passwords[SUPPORT]);
	check("webmail login with a mailbox password works", supportLogin.result.status === 200, String(supportLogin.result.status));
	const viaAdminPortal = await login(SUPPORT, passwords[SUPPORT], true);
	check("admin portal refuses a mailbox password", viaAdminPortal.result.status === 401, String(viaAdminPortal.result.status));
	const ownerMailboxLogin = await login(adminMailboxAddress, passwords[adminMailboxAddress]);
	check("admin's own mailbox can sign in to webmail", ownerMailboxLogin.result.status === 200, String(ownerMailboxLogin.result.status));
	const ownerWebmail = ownerMailboxLogin.session.call;
	const me = await ownerWebmail("/api/auth/me");
	check("webmail session of an admin reports role user", me.json?.user?.role === "user" && me.json?.user?.sessionScope === "mailbox", JSON.stringify(me.json?.user ?? {}));
	for (const path of ["/api/accounts", "/api/backups", "/api/audit-logs", "/api/admin/general", "/api/webhooks", "/api/admin/api-keys"]) {
		const result = await ownerWebmail(path);
		check(`webmail session of an admin is refused ${path}`, result.status === 401 || result.status === 403, String(result.status));
	}
	const adminCheck = await adminApi("/api/admin/general");
	check("admin portal session reaches admin APIs", adminCheck.status === 200, String(adminCheck.status));

	// ── Mailbox isolation within one account ────────────────────────────────
	console.log("Mailbox isolation");
	const support = supportLogin.session.call;
	const supportList = await support("/api/mailboxes");
	const visible = (supportList.json?.mailboxes ?? []).map((mailbox) => `${mailbox.localPart}@${mailbox.hostname}`);
	check("support session lists only support@", visible.length === 1 && visible[0] === SUPPORT, visible.join(", "));

	const billingLogin = await login(BILLING, passwords[BILLING]);
	const billingMessages = await billingLogin.session.call(`/api/messages?mailboxId=${ids[BILLING]}`);
	const billingMessageId = billingMessages.json?.messages?.[0]?.id;
	check("billing session can read billing@", billingMessages.status === 200 && !!billingMessageId, String(billingMessages.status));

	const crossList = await support(`/api/messages?mailboxId=${ids[BILLING]}`);
	check("support session cannot list billing@ by mailboxId", crossList.status === 404 || crossList.status === 403, String(crossList.status));
	const allList = await support("/api/messages");
	const leaked = (allList.json?.messages ?? []).filter((message) => message.mailboxId !== ids[SUPPORT]);
	check("support session's unfiltered list holds only support@ mail", allList.status === 200 && leaked.length === 0, `${leaked.length} foreign rows`);
	if (billingMessageId) {
		const crossRead = await support(`/api/messages/${billingMessageId}`);
		check("support session cannot open a billing@ message by id", crossRead.status === 404, String(crossRead.status));
		const crossThread = await support(`/api/messages/${billingMessageId}/thread`);
		check("support session cannot open a billing@ thread by id", crossThread.status === 404 || crossThread.status === 403, String(crossThread.status));
		const crossBulk = await support("/api/messages/bulk", { method: "PATCH", body: { messageIds: [billingMessageId], action: "trash" } });
		check("support session cannot bulk-trash a billing@ message", crossBulk.status === 404 || crossBulk.status === 403, String(crossBulk.status));
		const crossStar = await support(`/api/messages/${billingMessageId}/star`, { method: "PATCH", body: { starred: true } });
		check("support session cannot star a billing@ message", crossStar.status >= 400, String(crossStar.status));
	}
	const crossSend = await support("/api/send", {
		method: "POST",
		body: { mailboxId: ids[BILLING], from: BILLING, to: "someone@example.net", subject: "x", text: "x" },
	});
	check("support session cannot send from billing@", crossSend.status === 403 || crossSend.status === 404, `${crossSend.status} ${JSON.stringify(crossSend.json)}`);
	const crossDraft = await support("/api/drafts", {
		method: "POST",
		body: { mailboxId: ids[BILLING], from: BILLING, to: "someone@example.net", subject: "x", html: "<p>x</p>" },
	});
	check("support session cannot create a draft in billing@", crossDraft.status === 403 || crossDraft.status === 404, String(crossDraft.status));
	const crossFolders = await support(`/api/folders?mailboxId=${ids[BILLING]}`);
	check("support session cannot list billing@ folders", crossFolders.status === 404 || crossFolders.status === 403, String(crossFolders.status));
	const crossContacts = await support(`/api/contacts?mailboxId=${ids[BILLING]}`);
	check("support session cannot list billing@ contacts", crossContacts.status >= 400, String(crossContacts.status));
	const crossExport = await support(`/api/export/messages?mailboxId=${ids[BILLING]}`);
	check("support session cannot export billing@", crossExport.status >= 400, String(crossExport.status));

	// ── Admins do not read users' mail ──────────────────────────────────────
	console.log("Admin vs user mail");
	if (billingMessageId) {
		const adminRead = await adminApi(`/api/messages/${billingMessageId}`);
		check("admin cannot open a user's message", adminRead.status === 404, String(adminRead.status));
	}
	const adminList = await adminApi(`/api/messages?mailboxId=${ids[SUPPORT]}`);
	check("admin cannot list a user's mailbox", adminList.status === 404 || adminList.status === 403, String(adminList.status));

	// ── Account-wide settings from a webmail session ────────────────────────
	console.log("Account settings");
	const resetChange = await support("/api/settings/profile", { method: "PATCH", body: { name: "Support", resetEmail: "attacker@example.net" } });
	check("webmail session cannot change the recovery email", resetChange.status === 403, String(resetChange.status));
	const forwarding = await support("/api/settings/forwarding", { method: "PATCH", body: { forwardingEmail: "attacker@example.net" } });
	check("webmail session cannot set account forwarding", forwarding.status === 403, String(forwarding.status));
	const adminResetNoPassword = await adminApi("/api/settings/profile", { method: "PATCH", body: { name: "Owner", resetEmail: "elsewhere@example.org" } });
	check("recovery email change needs the current password", adminResetNoPassword.status === 403, String(adminResetNoPassword.status));

	// ── Administration endpoints for plain users ────────────────────────────
	console.log("Administration surface");
	const domainId = (await adminApi("/api/domains")).json?.domains?.find((domain) => domain.hostname === "example.com")?.id;
	if (domainId) {
		const userRule = await support(`/api/routing-rules/domain?mailboxId=${ids[SUPPORT]}`, {
			method: "POST",
			body: { domainId, enabled: true, matchField: "recipient", matchOperator: "contains", matchValue: "@", action: "reject", keepCopy: false, priority: 100 },
		});
		check("plain user cannot create a domain reject rule", userRule.status === 403, String(userRule.status));
		const userRuleList = await support(`/api/routing-rules/domain?domainId=${domainId}&mailboxId=${ids[SUPPORT]}`);
		check("plain user cannot list domain rules", userRuleList.status === 403, String(userRuleList.status));
		const userMailbox = await support("/api/mailboxes", { method: "POST", body: { domainId, localPart: "postmaster" } });
		check("plain user cannot create mailboxes", userMailbox.status === 403, String(userMailbox.status));
	}
	const privateHook = await adminApi("/api/webhooks", { method: "POST", body: { url: "http://127.0.0.1:6379/", events: ["message.inbound"] } });
	check("webhooks to private addresses are refused", privateHook.status === 400 || privateHook.status === 403, String(privateHook.status));

	// ── Password change from webmail rotates the mailbox password ───────────
	console.log("Mailbox password");
	const changed = await support("/api/settings/password", {
		method: "PATCH",
		body: { currentPassword: passwords[SUPPORT], newPassword: "support-mailbox-pass-2" },
	});
	check("webmail password change succeeds and signs out", changed.status === 200 && changed.json?.signedOut === true, `${changed.status} ${JSON.stringify(changed.json)}`);
	const afterChange = await support("/api/mailboxes");
	check("old webmail session is revoked", afterChange.status === 401 || afterChange.status === 500, String(afterChange.status));
	const oldPassword = await login(SUPPORT, passwords[SUPPORT]);
	check("old mailbox password no longer works", oldPassword.result.status === 401, String(oldPassword.result.status));
	const newPassword = await login(SUPPORT, "support-mailbox-pass-2");
	check("new mailbox password works", newPassword.result.status === 200, String(newPassword.result.status));
	await adminApi(`/api/mailboxes/${ids[SUPPORT]}/password`, { method: "POST", body: { password: passwords[SUPPORT] } });

	// ── Rate limiting ────────────────────────────────────────────────────────
	console.log("Rate limiting");
	let limited = false;
	for (let attempt = 0; attempt < 30 && !limited; attempt += 1) {
		const result = await client().call("/api/auth/login", {
			method: "POST",
			body: { email: SUPPORT, password: "wrong-password" },
			headers: { "cf-connecting-ip": `203.0.113.${attempt}` },
		});
		limited = result.status === 429;
	}
	check("a spoofed cf-connecting-ip does not bypass the login limit", limited);

	console.log(`\n${passes} passed, ${failures} failed`);
	process.exitCode = failures ? 1 : 0;
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
