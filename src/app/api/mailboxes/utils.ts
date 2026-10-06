import { and, eq } from "drizzle-orm";
import type { AppDatabase } from "@/db";
import { domains, mailboxes } from "@/db/schema";
import { ensureMailboxDomainRouting } from "@/lib/mailboxes/domain-addresses";
import { newId } from "@/lib/ids";
import { listAccessibleMailboxes } from "@/lib/mailboxes/access";
import type { SessionUser } from "@/lib/auth/types";

export async function ensurePersonalMailbox(env: CloudflareEnv, db: AppDatabase, user: SessionUser) {
	const current = await listAccessibleMailboxes(db, user);
	// A webmail session is pinned to the mailbox it signed in with; never mint another.
	if (user.sessionScope === "mailbox") return current;
	if (current.some((mailbox) => mailbox.userId === user.id && mailbox.type === "personal")) return current;

	const [localPart, hostname] = user.email.toLowerCase().split("@");
	if (!localPart || !hostname) return current;
	// Only the caller's own organization's domains. In SaaS mode the signup email is
	// unverified, so matching any org's domain let a stranger claim that address.
	const [domain] = await db
		.select()
		.from(domains)
		.where(and(eq(domains.hostname, hostname), eq(domains.organizationId, user.organizationId)))
		.limit(1);
	if (!domain) return current;

	const [existing] = await db
		.select({ id: mailboxes.id })
		.from(mailboxes)
		.where(and(eq(mailboxes.domainId, domain.id), eq(mailboxes.localPart, localPart)))
		.limit(1);
	if (existing) return current;

	const id = newId("mbx");
	try {
		await db.insert(mailboxes).values({
			id,
			userId: user.id,
			domainId: domain.id,
			localPart,
			displayName: user.name || localPart,
			type: "personal",
			organizationId: user.organizationId,
		});
	} catch {
		return current;
	}
	try {
		await ensureMailboxDomainRouting(env, db, { id, domainId: domain.id, localPart, useAllDomains: true });
	} catch {
		// Mailbox visibility should not depend on routing sync availability.
	}

	return listAccessibleMailboxes(db, user);
}
