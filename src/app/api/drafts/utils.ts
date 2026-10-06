import type { AppDatabase } from "@/db";
import type { SessionUser } from "@/lib/auth/types";
import { getAuthorizedSenderAddress } from "@/lib/email/sender";
import { getMailboxAccessLevel } from "@/lib/mailboxes/access";
import type { DraftPayload } from "./types";

export async function getDraftSender(
	env: CloudflareEnv,
	user: Pick<SessionUser, "id" | "sessionMailboxId">,
	input: DraftPayload,
): Promise<{ fromAddr: string; mailboxId: string } | { error: string }> {
	try {
		return await getAuthorizedSenderAddress(env, {
			userId: user.id,
			sessionMailboxId: user.sessionMailboxId ?? null,
			from: input.from ?? "",
			mailboxId: input.mailboxId,
		});
	} catch (error) {
		return { error: error instanceof Error ? error.message : "Mailbox is not authorized" };
	}
}

export function userOwnsDraft(draft: { userId: string; status: string } | undefined, userId: string): boolean {
	return !!draft && draft.userId === userId && draft.status === "draft";
}

/**
 * Ownership alone is not enough: the draft's mailbox must still be open to this
 * session (sharing can be revoked, and webmail sessions are pinned to one mailbox).
 */
export async function userCanUseDraft(
	db: AppDatabase,
	user: Pick<SessionUser, "id" | "role" | "sessionMailboxId">,
	draft: { userId: string; status: string; mailboxId: string | null } | undefined,
): Promise<boolean> {
	if (!draft || !userOwnsDraft(draft, user.id)) return false;
	if (!draft.mailboxId) return !user.sessionMailboxId;
	const access = await getMailboxAccessLevel(db, user, draft.mailboxId);
	return !!access?.canRead;
}
