import { and, eq, or } from "drizzle-orm";
import type { AppDatabase } from "@/db";
import { domains, mailboxAccess, mailboxes, users } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/types";
import { isTeamMailboxSharingEnabled } from "./access-utils";
import type { MailboxAccessLevel, MailboxPermission } from "./types";

export { canAdministerOrganizationMailboxes } from "./admin-scope";

const permissionRank: Record<MailboxPermission, number> = {
	read_only: 1,
	send_on_behalf: 2,
	send_as: 3,
	full_access: 4,
};

export function hasMailboxPermission(permission: MailboxPermission, required: MailboxPermission): boolean {
	return permissionRank[permission] >= permissionRank[required];
}

export async function getMailboxAccessLevel(
	db: AppDatabase,
	user: Pick<SessionUser, "id" | "role" | "sessionMailboxId">,
	mailboxId: string,
): Promise<MailboxAccessLevel | null> {
	const [mailbox] = await db.select().from(mailboxes).where(eq(mailboxes.id, mailboxId)).limit(1);
	if (!mailbox || mailbox.disabled) return null;

	// A webmail session owns only the mailbox whose password signed it in.
	const isOwner = mailbox.userId === user.id && ownedMailboxAllowed(user, mailbox.id);
	if (isOwner) return buildAccess(mailbox, "full_access", true);
	if (mailbox.type !== "shared" || !(await isTeamMailboxSharingEnabled(db))) return null;

	const [delegatedAccess] = await db
		.select({ permission: mailboxAccess.permission })
		.from(mailboxAccess)
		.where(and(eq(mailboxAccess.mailboxId, mailbox.id), eq(mailboxAccess.userId, user.id)))
		.limit(1);
	if (delegatedAccess) return buildAccess(mailbox, delegatedAccess.permission, false);

	return null;
}

export async function listAccessibleMailboxes(db: AppDatabase, user: Pick<SessionUser, "id" | "email" | "role" | "sessionMailboxId">) {
	const ownedRows = await db
		.select({
			id: mailboxes.id,
			userId: mailboxes.userId,
			domainId: mailboxes.domainId,
		localPart: mailboxes.localPart,
		displayName: mailboxes.displayName,
		signature: mailboxes.signature,
		autoReplyEnabled: mailboxes.autoReplyEnabled,
		autoReplySubject: mailboxes.autoReplySubject,
		autoReplyBody: mailboxes.autoReplyBody,
		useAllDomains: mailboxes.useAllDomains,
			avatarKey: mailboxes.avatarKey,
			type: mailboxes.type,
			disabled: mailboxes.disabled,
			createdAt: mailboxes.createdAt,
			hostname: domains.hostname,
		})
		.from(mailboxes)
		.innerJoin(domains, eq(mailboxes.domainId, domains.id))
		.where(and(eq(mailboxes.userId, user.id), eq(mailboxes.disabled, false)));
	const owned = ownedRows
		.filter((row) => ownedMailboxAllowed(user, row.id))
		.map((row) => {
			const { avatarKey, ...mailbox } = row;
			return {
				...mailbox,
				hasAvatar: !!avatarKey,
				permission: "full_access" as MailboxPermission,
				isPrimary: `${row.localPart}@${row.hostname}` === user.email,
			};
		});

	if (!(await isTeamMailboxSharingEnabled(db))) return owned;
	const sharedRows = await db
		.select({
			id: mailboxes.id,
			userId: mailboxes.userId,
			domainId: mailboxes.domainId,
		localPart: mailboxes.localPart,
		displayName: mailboxes.displayName,
		signature: mailboxes.signature,
		autoReplyEnabled: mailboxes.autoReplyEnabled,
		autoReplySubject: mailboxes.autoReplySubject,
		autoReplyBody: mailboxes.autoReplyBody,
		useAllDomains: mailboxes.useAllDomains,
			avatarKey: mailboxes.avatarKey,
			type: mailboxes.type,
			disabled: mailboxes.disabled,
			createdAt: mailboxes.createdAt,
			hostname: domains.hostname,
			permission: mailboxAccess.permission,
		})
		.from(mailboxAccess)
		.innerJoin(mailboxes, eq(mailboxAccess.mailboxId, mailboxes.id))
		.innerJoin(domains, eq(mailboxes.domainId, domains.id))
		.where(
			and(
				eq(mailboxAccess.userId, user.id),
				eq(mailboxes.type, "shared"),
				eq(mailboxes.disabled, false),
			),
		);
	const shared = sharedRows.map((row) => {
		const { avatarKey, ...mailbox } = row;
		return {
			...mailbox,
			hasAvatar: !!avatarKey,
			isPrimary: false,
		};
	});

	return [...owned, ...shared];
}

/**
 * Every mailbox on a domain in this organization, including ones owned by
 * other accounts. Used by the admin console. Does not grant mail read access.
 */
export async function listOrganizationMailboxes(
	db: AppDatabase,
	user: Pick<SessionUser, "id" | "email" | "organizationId">,
) {
	const rows = await db
		.select({
			id: mailboxes.id,
			userId: mailboxes.userId,
			domainId: mailboxes.domainId,
			localPart: mailboxes.localPart,
			displayName: mailboxes.displayName,
			signature: mailboxes.signature,
			autoReplyEnabled: mailboxes.autoReplyEnabled,
			autoReplySubject: mailboxes.autoReplySubject,
			autoReplyBody: mailboxes.autoReplyBody,
			useAllDomains: mailboxes.useAllDomains,
			avatarKey: mailboxes.avatarKey,
			type: mailboxes.type,
			disabled: mailboxes.disabled,
			createdAt: mailboxes.createdAt,
			hostname: domains.hostname,
		})
		.from(mailboxes)
		.innerJoin(domains, eq(mailboxes.domainId, domains.id))
		.innerJoin(users, eq(mailboxes.userId, users.id))
		.where(
			or(
				eq(users.organizationId, user.organizationId),
				eq(domains.organizationId, user.organizationId),
				eq(mailboxes.organizationId, user.organizationId),
			),
		);
	return rows.map((row) => {
		const { avatarKey, ...mailbox } = row;
		return {
			...mailbox,
			hasAvatar: !!avatarKey,
			permission: "full_access" as MailboxPermission,
			isPrimary: `${row.localPart}@${row.hostname}` === user.email,
		};
	});
}

export async function getOrganizationMailbox(
	db: AppDatabase,
	organizationId: string,
	mailboxId: string,
) {
	const [row] = await db
		.select({
			id: mailboxes.id,
			userId: mailboxes.userId,
			domainId: mailboxes.domainId,
			localPart: mailboxes.localPart,
		})
		.from(mailboxes)
		.innerJoin(domains, eq(mailboxes.domainId, domains.id))
		.innerJoin(users, eq(mailboxes.userId, users.id))
		.where(
			and(
				eq(mailboxes.id, mailboxId),
				or(
					eq(users.organizationId, organizationId),
					eq(domains.organizationId, organizationId),
					eq(mailboxes.organizationId, organizationId),
				),
			),
		)
		.limit(1);
	return row ?? null;
}

export async function listAccessibleMailboxIds(db: AppDatabase, user: Pick<SessionUser, "id" | "email" | "role" | "sessionMailboxId">) {
	const rows = await listAccessibleMailboxes(db, user);
	return rows.map((row) => row.id);
}

/** Mailbox-scope sessions are pinned to one owned mailbox; every other session sees all owned ones. */
export function ownedMailboxAllowed(user: Pick<SessionUser, "sessionMailboxId">, mailboxId: string): boolean {
	return !user.sessionMailboxId || user.sessionMailboxId === mailboxId;
}

function buildAccess(
	mailbox: MailboxAccessLevel["mailbox"],
	permission: MailboxPermission,
	isOwner: boolean,
): MailboxAccessLevel {
	return {
		mailbox,
		permission,
		isOwner,
		canRead: hasMailboxPermission(permission, "read_only"),
		canSendAs: hasMailboxPermission(permission, "send_as"),
		canSendOnBehalf: hasMailboxPermission(permission, "send_on_behalf"),
		canManage: hasMailboxPermission(permission, "full_access"),
	};
}
