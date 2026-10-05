import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getEnv } from "@/lib/cloudflare";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { createSession, SESSION_COOKIE } from "@/lib/auth/session";
import { newId } from "@/lib/ids";
import { saasSignupSchema } from "@/lib/validators";
import { readJsonBody } from "@/lib/http/request";
import { RequestBodyTooLargeError } from "@/lib/http/errors";
import { verifyTurnstileToken } from "@/lib/auth/turnstile";
import { createOrganization, isSaasMode } from "@/lib/organizations/service";
import { organizationsCollection, orgSettingsCollection } from "@/lib/organizations/mongo-collections";
import { ensureBookingUsername } from "@/lib/booking/username";

export async function POST(request: Request) {
	const env = getEnv();
	if (!isSaasMode(env)) {
		return NextResponse.json({ error: "Public signup is not enabled on this installation" }, { status: 403 });
	}
	if (!env.MONGO) {
		return NextResponse.json({ error: "MongoDB is required for multi-organization signup" }, { status: 503 });
	}

	let body: unknown;
	try {
		body = await readJsonBody(request, 16 * 1024);
	} catch (error) {
		const status = error instanceof RequestBodyTooLargeError ? 413 : 400;
		return NextResponse.json({ error: "Invalid signup request" }, { status });
	}

	const parsed = saasSignupSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
	}
	if (!(await verifyTurnstileToken(env, request, (body as Record<string, unknown>).turnstileToken))) {
		return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 400 });
	}

	const db = getDb(env);
	const email = parsed.data.email.toLowerCase().trim();
	const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
	if (existing) {
		return NextResponse.json({ error: "Email already registered" }, { status: 409 });
	}

	const userId = newId("usr");
	let organizationId: string | null = null;
	try {
		const org = await createOrganization(env, {
			name: parsed.data.organizationName,
			ownerUserId: userId,
		});
		organizationId = org._id;

		await db.insert(users).values({
			id: userId,
			email,
			resetEmail: email,
			passwordHash: hashPassword(parsed.data.password),
			name: parsed.data.name.trim(),
			role: "admin",
			isPrimaryAdmin: true,
			canManageDomains: true,
			canManageUsers: true,
			canManageMailboxes: true,
			organizationId,
		});
		await ensureBookingUsername(env, userId, email);
	} catch (error) {
		if (organizationId && env.MONGO) {
			await Promise.allSettled([
				organizationsCollection(env.MONGO).deleteOne({ _id: organizationId }),
				orgSettingsCollection(env.MONGO).deleteMany({ organizationId }),
			]);
		}
		try {
			await db.delete(users).where(eq(users.id, userId));
		} catch {
			// user may not have been inserted
		}
		const message = error instanceof Error ? error.message : "Signup failed";
		return NextResponse.json({ error: message }, { status: 500 });
	}

	const token = await createSession(env, userId);
	const response = NextResponse.json({
		ok: true,
		token,
		redirect: "/onboarding/domain",
		organizationId,
	});
	response.headers.set("Cache-Control", "no-store");
	response.cookies.set(SESSION_COOKIE, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 30 * 24 * 60 * 60,
	});
	return response;
}
