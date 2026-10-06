import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getEnv } from "@/lib/cloudflare";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, SESSION_COOKIE } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validators";
import { allowLoginAttempt } from "@/lib/auth/rate-limit";
import { verifyTurnstileToken } from "@/lib/auth/turnstile";
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
	if (!(await verifyTurnstileToken(env, request, (body as Record<string, unknown>).turnstileToken))) {
		return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 400 });
	}

	const db = getDb(env);
	const email = parsed.data.email.trim().toLowerCase();
	const password = parsed.data.password;

	// Prefer mailbox password (IMAP/SMTP AUTH identity); fall back to users.password_hash.
	const mailboxAuth = await authenticateMailboxAddress(env, email, password);
	let userId: string | null = mailboxAuth?.userId ?? null;
	if (!userId) {
		const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
		if (user && verifyPassword(password, user.passwordHash) && !user.disabled) {
			userId = user.id;
		}
	}
	if (!userId) {
		return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
	}

	const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
	if (!user || user.disabled) {
		return NextResponse.json({ error: "Account disabled" }, { status: 403 });
	}

	if (parsed.data.adminPortal && user.role !== "admin") {
		return NextResponse.json({ error: "Admin access required" }, { status: 403 });
	}

	if (user.totpEnabled && user.totpSecret) {
		const challengeToken = await createLoginChallenge(env, user.id);
		const pending = NextResponse.json({ ok: true, mfaRequired: true, challengeToken });
		pending.headers.set("Cache-Control", "no-store");
		return pending;
	}

	const token = await createSession(env, user.id);
	await recordAuthActivity(env, { action: "auth.login", userId: user.id, request });
	const redirect = user.role === "admin" ? "/admin" : "/inbox";
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
