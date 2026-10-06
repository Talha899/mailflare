import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getEnv } from "@/lib/cloudflare";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { burnPasswordCheck, verifyPasswordAsync } from "@/lib/auth/password";
import { createSession, SESSION_COOKIE, type SessionOptions } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validators";
import { allowLoginAttempt } from "@/lib/auth/rate-limit";
import { readJsonBody } from "@/lib/http/request";
import { RequestBodyTooLargeError } from "@/lib/http/errors";
import { recordAuthActivity } from "@/lib/auth/activity";
import { createLoginChallenge } from "@/lib/auth/login-challenge";
import { authenticateMailboxAddress } from "@/lib/mailboxes/credentials";

export async function POST(request: Request) {
	const env = getEnv();
	let body: unknown;
	try {
		body = await readJsonBody(request, 16 * 1024);
	} catch (error) {
		const status = error instanceof RequestBodyTooLargeError ? 413 : 400;
		return NextResponse.json({ error: "Invalid login request" }, { status });
	}
	const parsed = loginSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
	}
	if (!(await allowLoginAttempt(env, request))) {
		return NextResponse.json(
			{ error: "Too many login attempts. Try again shortly." },
			{ status: 429, headers: { "Retry-After": "60" } },
		);
	}

	const db = getDb(env);
	const email = parsed.data.email.trim().toLowerCase();
	const password = parsed.data.password;
	const adminPortal = Boolean(parsed.data.adminPortal);

	let userId: string | null = null;
	let redirect: "/admin" | "/inbox";
	let sessionOptions: SessionOptions;

	if (adminPortal) {
		// Admin portal: users.password_hash only — never mailbox auth.
		const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
		const valid = user
			? await verifyPasswordAsync(password, user.passwordHash)
			: await burnPasswordCheck(password);
		// Same answer for "no such admin", "wrong password" and "not an admin", so
		// the admin login cannot be used to discover which accounts are admins.
		if (!user || !valid || user.disabled || user.role !== "admin") {
			return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
		}
		userId = user.id;
		redirect = "/admin";
		sessionOptions = { scope: "admin" };
	} else {
		// Mailbox webmail: mailboxes.password_hash only — never users.password_hash.
		// The session is pinned to this mailbox and carries no admin rights.
		const mailboxAuth = await authenticateMailboxAddress(env, email, password);
		if (!mailboxAuth) {
			return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
		}
		userId = mailboxAuth.userId;
		redirect = "/inbox";
		sessionOptions = { scope: "mailbox", mailboxId: mailboxAuth.mailboxId };
	}

	const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
	if (!user || user.disabled) {
		return NextResponse.json({ error: "Account disabled" }, { status: 403 });
	}

	if (user.totpEnabled && user.totpSecret) {
		const challengeToken = await createLoginChallenge(env, user.id, sessionOptions);
		const pending = NextResponse.json({
			ok: true,
			mfaRequired: true,
			challengeToken,
			redirect,
		});
		pending.headers.set("Cache-Control", "no-store");
		return pending;
	}

	const token = await createSession(env, user.id, sessionOptions);
	await recordAuthActivity(env, { action: "auth.login", userId: user.id, request });
	const response = NextResponse.json({
		ok: true,
		token,
		redirect,
	});
	response.headers.set("Cache-Control", "no-store");
	response.cookies.set(SESSION_COOKIE, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 60 * 60 * 24 * 30,
	});
	return response;
}
