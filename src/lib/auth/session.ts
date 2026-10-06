import { and, eq, gt, ne } from "drizzle-orm";
import { newId } from "@/lib/ids";
import { getDb } from "@/db";
import { sessions, users } from "@/db/schema";

export const SESSION_COOKIE = "ep_session";
const SESSION_DAYS = 30;

export function generateSessionToken(): string {
	return newId("sess");
}

export async function hashSessionToken(token: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
	return Array.from(new Uint8Array(digest))
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

/**
 * account: legacy/self-service sessions (signup), unrestricted as before.
 * admin: signed in through the admin portal with the account password.
 * mailbox: signed in to webmail with one mailbox's password. Such a session
 * never carries admin rights and only reaches that mailbox (plus shared
 * mailboxes explicitly delegated to the user).
 */
export type SessionScope = "account" | "admin" | "mailbox";

export type SessionOptions = { scope?: SessionScope; mailboxId?: string | null };

export type SessionUserRow = typeof users.$inferSelect & {
	sessionScope: SessionScope;
	sessionMailboxId: string | null;
};

export async function createSession(env: CloudflareEnv, userId: string, options: SessionOptions = {}): Promise<string> {
	const db = getDb(env);
	const token = generateSessionToken();
	const tokenHash = await hashSessionToken(token);
	const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
	const scope = options.scope ?? "account";
	if (scope === "mailbox" && !options.mailboxId) throw new Error("A mailbox session needs a mailbox");

	await db.insert(sessions).values({
		id: newId(),
		userId,
		tokenHash,
		expiresAt,
		scope,
		mailboxId: scope === "mailbox" ? options.mailboxId : null,
	});

	return token;
}

function normalizeScope(value: string | null | undefined): SessionScope {
	return value === "admin" || value === "mailbox" ? value : "account";
}

/**
 * The user behind a session token. A mailbox-scope session is returned with
 * every administrative flag cleared, so each existing `role === "admin"` and
 * permission check denies it on the server.
 */
export async function getUserFromSession(
	env: CloudflareEnv,
	token: string | undefined,
): Promise<SessionUserRow | null> {
	if (!token) return null;
	const db = getDb(env);
	const tokenHash = await hashSessionToken(token);
	const [session] = await db
		.select()
		.from(sessions)
		.where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
		.limit(1);
	if (!session) return null;
	const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
	if (!user) return null;
	const sessionScope = normalizeScope(session.scope);
	if (sessionScope === "mailbox") {
		return {
			...user,
			role: "user",
			isPrimaryAdmin: false,
			canManageDomains: false,
			canManageUsers: false,
			canManageMailboxes: false,
			sessionScope,
			sessionMailboxId: session.mailboxId ?? null,
		};
	}
	return { ...user, sessionScope, sessionMailboxId: null };
}

/** Sign out every webmail session pinned to one mailbox, e.g. after its password changes. */
export async function deleteMailboxSessions(env: CloudflareEnv, mailboxId: string, keepToken?: string): Promise<void> {
	const db = getDb(env);
	const conditions = [eq(sessions.scope, "mailbox"), eq(sessions.mailboxId, mailboxId)];
	if (keepToken) conditions.push(ne(sessions.tokenHash, await hashSessionToken(keepToken)));
	await db.delete(sessions).where(and(...conditions));
}

export async function deleteSession(env: CloudflareEnv, token: string): Promise<void> {
	const db = getDb(env);
	const tokenHash = await hashSessionToken(token);
	await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}

/**
 * Sign the user out everywhere, optionally keeping the session that made the
 * request. Used after a password change or reset and when MFA is switched on.
 */
export async function deleteUserSessions(env: CloudflareEnv, userId: string, keepToken?: string): Promise<void> {
	const db = getDb(env);
	if (keepToken) {
		const keepHash = await hashSessionToken(keepToken);
		await db.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.tokenHash, keepHash)));
		return;
	}
	await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** The session token a request carries, from the Bearer header or the cookie. */
export function getSessionTokenFromRequestHeaders(request: Request): string | undefined {
	const authorization = request.headers.get("Authorization");
	if (authorization?.startsWith("Bearer ")) return authorization.slice(7).trim() || undefined;
	const cookie = request.headers.get("Cookie") ?? "";
	const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
	return match ? decodeURIComponent(match[1]) : undefined;
}
