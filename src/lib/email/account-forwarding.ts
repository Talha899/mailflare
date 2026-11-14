import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { mailboxAliases, mailboxes, domains, users } from "@/db/schema";
import { resolveInboundAddress } from "@/lib/email/routing";
import { uniqueForwardDestinations } from "@/lib/email/forward-destinations";
import { getLicenseEntitlements } from "@/lib/licenses/service";

export const MAILFLARE_FORWARDED_HEADER = "X-Mailflare-Forwarded";

/**
 * Addresses that should receive a copy when mail is stored for `recipient`.
 *
 * The mailbox address is first and is not license-gated: only an admin can set
 * it, and it is never returned to webmail. The account address stays behind
 * the Pro/Team forwarding entitlement, matching account settings.
 * A destination that delivers back into this same mailbox is dropped.
 */
export async function getCopyForwardDestinations(
	env: CloudflareEnv,
	recipient: string,
	exclude: Array<string | null | undefined> = [],
): Promise<string[]> {
	const db = getDb(env);
	const decision = await resolveInboundAddress(db, recipient);
	const mailbox = decision?.mailbox;
	if (!mailbox) return [];

	const [row] = await db
		.select({
			mailboxForwardingEmail: mailboxes.forwardingEmail,
			accountForwardingEmail: users.forwardingEmail,
		})
		.from(mailboxes)
		.innerJoin(users, eq(users.id, mailboxes.userId))
		.where(eq(mailboxes.id, mailbox.mailboxId))
		.limit(1);
	if (!row) return [];

	const mailboxDestination = row.mailboxForwardingEmail?.trim() || null;
	const accountRaw = row.accountForwardingEmail?.trim() || null;
	const accountDestination = accountRaw && (await getLicenseEntitlements(env)).canForwardEmail ? accountRaw : null;
	if (!mailboxDestination && !accountDestination) return [];

	const aliasRows = await db
		.select({ localPart: mailboxAliases.localPart, hostname: domains.hostname })
		.from(mailboxAliases)
		.innerJoin(domains, eq(mailboxAliases.domainId, domains.id))
		.where(eq(mailboxAliases.mailboxId, mailbox.mailboxId));

	const candidates = uniqueForwardDestinations(
		[mailboxDestination, accountDestination],
		[
			recipient,
			`${mailbox.localPart}@${mailbox.hostname}`,
			...aliasRows.map((alias) => `${alias.localPart}@${alias.hostname}`),
			...exclude,
		],
	);

	const destinations: string[] = [];
	for (const destination of candidates) {
		const resolved = await resolveInboundAddress(db, destination);
		if (resolved?.mailbox?.mailboxId === mailbox.mailboxId) continue;
		destinations.push(destination);
	}
	return destinations;
}
