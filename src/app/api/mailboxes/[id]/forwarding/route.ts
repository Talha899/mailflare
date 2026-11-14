import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { mailboxes } from "@/db/schema";
import { requireUser } from "@/lib/auth/cookies";
import { hasValidSessionMutationOrigin } from "@/lib/auth/origin";
import { getEnv } from "@/lib/cloudflare";
import { resolveInboundAddress } from "@/lib/email/routing";
import { createAuditLog } from "@/lib/mailboxes/audit";
import { canAdministerOrganizationMailboxes, getOrganizationMailbox } from "@/lib/mailboxes/access";
import { updateMailboxForwardingSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

/**
 * Per-mailbox copy destination. Admin console sessions only.
 * Webmail sessions and plain users get 403, and the regular mailbox payload
 * never includes this field.
 */
async function loadAdminMailbox(request: Request, id: string) {
	const env = getEnv();
	const user = await requireUser(env, request);
	if (!canAdministerOrganizationMailboxes(user)) {
		return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
	}
	const db = getDb(env);
	const mailbox = await getOrganizationMailbox(db, user.organizationId, id);
	if (!mailbox) {
		return { ok: false as const, response: NextResponse.json({ error: "Mailbox not found" }, { status: 404 }) };
	}
	return { ok: true as const, env, db, user, mailbox };
}

export async function GET(request: Request, { params }: Params) {
	const { id } = await params;
	const access = await loadAdminMailbox(request, id);
	if (!access.ok) return access.response;

	const [row] = await access.db
		.select({ forwardingEmail: mailboxes.forwardingEmail })
		.from(mailboxes)
		.where(eq(mailboxes.id, access.mailbox.id))
		.limit(1);

	return NextResponse.json({ forwardingEmail: row?.forwardingEmail ?? null });
}

export async function PATCH(request: Request, { params }: Params) {
	const { id } = await params;
	const access = await loadAdminMailbox(request, id);
	if (!access.ok) return access.response;
	if (!hasValidSessionMutationOrigin(request)) {
		return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
	}

	const parsed = updateMailboxForwardingSchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Enter a valid email address, or leave it blank to turn forwarding off." },
			{ status: 400 },
		);
	}

	const destination = parsed.data.forwardingEmail;
	if (destination) {
		const resolved = await resolveInboundAddress(access.db, destination);
		if (resolved?.mailbox?.mailboxId === access.mailbox.id) {
			return NextResponse.json({ error: "A mailbox cannot forward to itself." }, { status: 400 });
		}
	}

	await access.db
		.update(mailboxes)
		.set({ forwardingEmail: destination })
		.where(eq(mailboxes.id, access.mailbox.id));

	await createAuditLog(access.env, {
		actorUserId: access.user.id,
		mailboxId: access.mailbox.id,
		action: "mailbox.forwarding_update",
		metadata: { forwardingEmail: destination },
	});

	return NextResponse.json({ forwardingEmail: destination });
}
