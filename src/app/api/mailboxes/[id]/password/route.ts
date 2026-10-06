import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { domains, mailboxes } from "@/db/schema";
import { canManageUsers } from "@/lib/auth/admin";
import { requireUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { hasValidSessionMutationOrigin } from "@/lib/auth/origin";
import { getMailboxConnectionInfo } from "@/lib/mailboxes/connection-info";
import { generateMailboxPassword, setMailboxPassword } from "@/lib/mailboxes/credentials";
import { createAuditLog } from "@/lib/mailboxes/audit";

type Params = { params: Promise<{ id: string }> };

/** Regenerate mailbox password (shown once). Admin only. */
export async function POST(request: Request, { params }: Params) {
	const { id } = await params;
	const env = getEnv();
	const user = await requireUser(env, request);
	if (!canManageUsers(user)) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}
	if (!hasValidSessionMutationOrigin(request)) {
		return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
	}

	const db = getDb(env);
	const [row] = await db
		.select({
			id: mailboxes.id,
			localPart: mailboxes.localPart,
			hostname: domains.hostname,
			organizationId: mailboxes.organizationId,
		})
		.from(mailboxes)
		.innerJoin(domains, eq(mailboxes.domainId, domains.id))
		.where(and(eq(mailboxes.id, id), eq(mailboxes.organizationId, user.organizationId)))
		.limit(1);

	if (!row) return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });

	let password = generateMailboxPassword();
	try {
		const body = (await request.json()) as { password?: string };
		if (typeof body.password === "string" && body.password.length >= 8) {
			password = body.password;
		}
	} catch {
		// empty body → generate
	}

	await setMailboxPassword(env, row.id, password);
	const address = `${row.localPart}@${row.hostname}`;
	await createAuditLog(env, {
		actorUserId: user.id,
		mailboxId: row.id,
		action: "mailbox.password_reset",
		metadata: { address },
	});

	return NextResponse.json({
		address,
		password,
		connection: getMailboxConnectionInfo(address),
	});
}
