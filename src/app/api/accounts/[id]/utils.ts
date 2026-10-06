import { and, eq, ne } from "drizzle-orm";
import type { getDb } from "@/db";
import { mailboxes, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";

type Db = ReturnType<typeof getDb>;

/**
 * An account by id, limited to the caller's organization when one is given.
 * Session routes always pass it: in SaaS mode an admin of one organization must
 * never read or edit another organization's users.
 */
export async function selectAccountById(db: Db, id: string, organizationId?: string) {
	const conditions = [eq(users.id, id)];
	if (organizationId) conditions.push(eq(users.organizationId, organizationId));
	const [account] = await db.select().from(users).where(and(...conditions)).limit(1);
	return account ?? null;
}

export async function emailBelongsToAnotherAccount(db: Db, accountId: string, email: string) {
	const [account] = await db
		.select({ id: users.id })
		.from(users)
		.where(and(eq(users.email, email), ne(users.id, accountId)))
		.limit(1);
	return !!account;
}

export async function updateAccountCredentials(
	db: Db,
	id: string,
	input: { email?: string; name: string; password: string | null; disabled?: boolean },
) {
	const passwordHash = input.password ? hashPassword(input.password) : null;
	await db
		.update(users)
		.set({
			...(input.email ? { email: input.email.trim().toLowerCase() } : {}),
			name: input.name,
			...(typeof input.disabled === "boolean" ? { disabled: input.disabled } : {}),
			...(passwordHash ? { passwordHash } : {}),
		})
		.where(eq(users.id, id));

	// Display name only — mailbox passwords are managed separately via mailbox password API.
	await db
		.update(mailboxes)
		.set({ displayName: input.name })
		.where(and(eq(mailboxes.userId, id), eq(mailboxes.type, "personal")));
}
