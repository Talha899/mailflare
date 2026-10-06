import { and, eq, gt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { loginChallenges } from "@/db/schema";
import { newId } from "@/lib/ids";
import { hashSessionToken, type SessionOptions, type SessionScope } from "@/lib/auth/session";

const CHALLENGE_MINUTES = 5;
/** Wrong codes allowed per challenge before the whole sign-in must start again. */
const MAX_FAILED_ATTEMPTS = 5;

export type LoginChallenge = {
	userId: string;
	scope: SessionScope;
	mailboxId: string | null;
};

/**
 * Issued once the password is right; the second factor completes it. The
 * challenge remembers which portal the password unlocked, so finishing it can
 * never grant more than the password did.
 */
export async function createLoginChallenge(env: CloudflareEnv, userId: string, options: SessionOptions = {}): Promise<string> {
	const db = getDb(env);
	const token = newId("mfa");
	const expiresAt = new Date(Date.now() + CHALLENGE_MINUTES * 60 * 1000);
	await db.insert(loginChallenges).values({
		id: newId(),
		userId,
		tokenHash: await hashSessionToken(token),
		expiresAt,
		scope: options.scope ?? "account",
		mailboxId: options.scope === "mailbox" ? options.mailboxId ?? null : null,
	});
	return token;
}

/** Look a challenge up without consuming it, so a wrong code can be retried a few times within the window. */
export async function getLoginChallenge(env: CloudflareEnv, token: string): Promise<LoginChallenge | null> {
	const db = getDb(env);
	const [row] = await db
		.select({
			userId: loginChallenges.userId,
			scope: loginChallenges.scope,
			mailboxId: loginChallenges.mailboxId,
			failedAttempts: loginChallenges.failedAttempts,
		})
		.from(loginChallenges)
		.where(and(eq(loginChallenges.tokenHash, await hashSessionToken(token)), gt(loginChallenges.expiresAt, new Date())))
		.limit(1);
	if (!row || row.failedAttempts >= MAX_FAILED_ATTEMPTS) return null;
	const scope: SessionScope = row.scope === "admin" || row.scope === "mailbox" ? row.scope : "account";
	return { userId: row.userId, scope, mailboxId: row.mailboxId ?? null };
}

/** Count a wrong code; once the limit is reached the challenge is discarded. */
export async function recordFailedLoginChallenge(env: CloudflareEnv, token: string): Promise<void> {
	const db = getDb(env);
	const tokenHash = await hashSessionToken(token);
	await db
		.update(loginChallenges)
		.set({ failedAttempts: sql`${loginChallenges.failedAttempts} + 1` })
		.where(eq(loginChallenges.tokenHash, tokenHash));
	await db
		.delete(loginChallenges)
		.where(and(eq(loginChallenges.tokenHash, tokenHash), gt(loginChallenges.failedAttempts, MAX_FAILED_ATTEMPTS - 1)));
}

export async function consumeLoginChallenge(env: CloudflareEnv, token: string): Promise<void> {
	const db = getDb(env);
	await db.delete(loginChallenges).where(eq(loginChallenges.tokenHash, await hashSessionToken(token)));
}
