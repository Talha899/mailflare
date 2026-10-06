import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getDb } from "@/db";
import { mailboxes, users } from "@/db/schema";
import { requireUser } from "@/lib/auth/cookies";
import { deleteUserSessions, getSessionTokenFromRequestHeaders } from "@/lib/auth/session";
import { hashPassword, verifyPasswordAsync } from "@/lib/auth/password";
import { allowLoginAttempt } from "@/lib/auth/rate-limit";
import { setMailboxPassword } from "@/lib/mailboxes/credentials";
import { getEnv } from "@/lib/cloudflare";
import type { ChangePasswordInput } from "./types";
import { parseChangePasswordRequest } from "./utils";

/**
 * Change the password this session signed in with. A webmail session changes
 * its mailbox's password (the one used for webmail, IMAP and SMTP); an account
 * or admin session changes the account password. The two never sync.
 */
export async function PATCH(request: Request) {
	const env = getEnv();
	const user = await requireUser(env, request);
	let parsed: ChangePasswordInput;

	try {
		parsed = await parseChangePasswordRequest(request);
	} catch (err) {
		if (err instanceof ZodError) {
			return NextResponse.json({ error: err.flatten() }, { status: 400 });
		}
		return NextResponse.json({ error: "Invalid request" }, { status: 400 });
	}

	// Checking the current password is a guessing oracle; throttle it like a login.
	if (!(await allowLoginAttempt(env, request))) {
		return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429, headers: { "Retry-After": "60" } });
	}

	const db = getDb(env);
	const keepToken = getSessionTokenFromRequestHeaders(request);

	if (user.sessionScope === "mailbox" && user.sessionMailboxId) {
		const [mailbox] = await db
			.select({ id: mailboxes.id, passwordHash: mailboxes.passwordHash })
			.from(mailboxes)
			.where(eq(mailboxes.id, user.sessionMailboxId))
			.limit(1);
		if (!mailbox?.passwordHash || !(await verifyPasswordAsync(parsed.currentPassword, mailbox.passwordHash))) {
			return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
		}
		if (await verifyPasswordAsync(parsed.newPassword, mailbox.passwordHash)) {
			return NextResponse.json({ error: "New password must be different from the current password" }, { status: 400 });
		}
		// setMailboxPassword signs out every webmail session of this mailbox,
		// including this one; the client sends the user back to sign in.
		await setMailboxPassword(env, mailbox.id, parsed.newPassword);
		return NextResponse.json({ ok: true, signedOut: true });
	}

	if (!(await verifyPasswordAsync(parsed.currentPassword, user.passwordHash))) {
		return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
	}

	if (await verifyPasswordAsync(parsed.newPassword, user.passwordHash)) {
		return NextResponse.json({ error: "New password must be different from the current password" }, { status: 400 });
	}

	const passwordHash = hashPassword(parsed.newPassword);
	// Account / admin password only — never sync to mailboxes.password_hash.
	await db
		.update(users)
		.set({ passwordHash })
		.where(eq(users.id, user.id));
	// Anyone else holding a session for this account is signed out; this one stays.
	await deleteUserSessions(env, user.id, keepToken);

	return NextResponse.json({ ok: true });
}
