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

/**
 * Set IMAP/SMTP AUTH + mailbox webmail password for one mailbox.
 * Never copies to users.password_hash — admin/account passwords stay independent.
 */
export async function setMailboxPassword(
	env: CloudflareEnv,
	mailboxId: string,
	password: string,
): Promise<void> {
	const db = getDb(env);
	const hash = hashMailboxPassword(password);
	const [mailbox] = await db.select().from(mailboxes).where(eq(mailboxes.id, mailboxId)).limit(1);
	if (!mailbox) throw new Error("Mailbox not found");
	await db.update(mailboxes).set({ passwordHash: hash }).where(eq(mailboxes.id, mailboxId));
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
 * Resolve a full email address to a mailbox and verify its mailbox password.
 * Uses mailboxes.password_hash only — never users.password_hash.
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
			userDisabled: users.disabled,
		})
		.from(mailboxes)
		.innerJoin(domains, eq(mailboxes.domainId, domains.id))
		.innerJoin(users, eq(mailboxes.userId, users.id))
		.where(and(eq(domains.hostname, hostname), eq(mailboxes.localPart, localPart)))
		.limit(1);

	if (!row || row.disabled || row.userDisabled) return null;
	if (!row.mailboxPasswordHash || !verifyMailboxPassword(password, row.mailboxPasswordHash)) {
		return null;
	}

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
