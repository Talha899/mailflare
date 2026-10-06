import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { domains, mailboxes, users } from "@/db/schema";
import {
	hashMailboxPassword,
	verifyMailboxPassword,
} from "@/lib/mailboxes/credentials-utils";

export {
	generateMailboxPassword,
	hashMailboxPassword,
	verifyMailboxPassword,
} from "@/lib/mailboxes/credentials-utils";

/** Set mailbox password and keep the owning user's passwordHash in sync for web login. */
export async function setMailboxPassword(
	env: CloudflareEnv,
	mailboxId: string,
	password: string,
): Promise<void> {
	const db = getDb(env);
	const hash = hashMailboxPassword(password);
	const [mailbox] = await db.select().from(mailboxes).where(eq(mailboxes.id, mailboxId)).limit(1);
	if (!mailbox) throw new Error("Mailbox not found");
	await db.batch([
		db.update(mailboxes).set({ passwordHash: hash }).where(eq(mailboxes.userId, mailbox.userId)),
		db.update(users).set({ passwordHash: hash }).where(eq(users.id, mailbox.userId)),
	]);
}

export type AuthenticatedMailbox = {
	mailboxId: string;
	userId: string;
	organizationId: string;
	localPart: string;
	hostname: string;
	address: string;
	disabled: boolean;
};

/**
 * Resolve a full email address to a mailbox and verify IMAP/SMTP/web password.
 * Prefer mailbox.password_hash; fall back to users.password_hash for legacy rows.
 */
export async function authenticateMailboxAddress(
	env: CloudflareEnv,
	address: string,
	password: string,
): Promise<AuthenticatedMailbox | null> {
	const normalized = address.trim().toLowerCase();
	const at = normalized.lastIndexOf("@");
	if (at <= 0) return null;
	const localPart = normalized.slice(0, at);
	const hostname = normalized.slice(at + 1);
	if (!localPart || !hostname) return null;

	const db = getDb(env);
	const [row] = await db
		.select({
			mailboxId: mailboxes.id,
			userId: mailboxes.userId,
			organizationId: mailboxes.organizationId,
			localPart: mailboxes.localPart,
			hostname: domains.hostname,
			disabled: mailboxes.disabled,
			mailboxPasswordHash: mailboxes.passwordHash,
			userPasswordHash: users.passwordHash,
			userDisabled: users.disabled,
		})
		.from(mailboxes)
		.innerJoin(domains, eq(mailboxes.domainId, domains.id))
		.innerJoin(users, eq(mailboxes.userId, users.id))
		.where(and(eq(domains.hostname, hostname), eq(mailboxes.localPart, localPart)))
		.limit(1);

	if (!row || row.disabled || row.userDisabled) return null;
	const hash = row.mailboxPasswordHash || row.userPasswordHash;
	if (!hash || !verifyMailboxPassword(password, hash)) return null;

	return {
		mailboxId: row.mailboxId,
		userId: row.userId,
		organizationId: row.organizationId,
		localPart: row.localPart,
		hostname: row.hostname,
		address: `${row.localPart}@${row.hostname}`,
		disabled: row.disabled,
	};
}

/** Sync mailbox password hash when a user's password changes (reset / admin). */
export async function syncMailboxPasswordsForUser(
	env: CloudflareEnv,
	userId: string,
	passwordHash: string,
): Promise<void> {
	const db = getDb(env);
	await db.update(mailboxes).set({ passwordHash }).where(eq(mailboxes.userId, userId));
}
