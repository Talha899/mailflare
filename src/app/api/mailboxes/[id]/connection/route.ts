import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { domains, mailboxes } from "@/db/schema";
import { canManageUsers } from "@/lib/auth/admin";
import { requireUser } from "@/lib/auth/cookies";
import { getEnv } from "@/lib/cloudflare";
import { getMailboxConnectionInfo } from "@/lib/mailboxes/connection-info";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
	const { id } = await params;
	const env = getEnv();
	const user = await requireUser(env, request);
	if (!canManageUsers(user)) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const db = getDb(env);
	const [row] = await db
		.select({
			id: mailboxes.id,
			localPart: mailboxes.localPart,
			hostname: domains.hostname,
			organizationId: mailboxes.organizationId,
			hasPassword: mailboxes.passwordHash,
		})
		.from(mailboxes)
		.innerJoin(domains, eq(mailboxes.domainId, domains.id))
		.where(and(eq(mailboxes.id, id), eq(mailboxes.organizationId, user.organizationId)))
		.limit(1);

	if (!row) return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });

	const address = `${row.localPart}@${row.hostname}`;
	return NextResponse.json({
		address,
		hasPassword: !!row.hasPassword,
		connection: getMailboxConnectionInfo(address),
	});
}
