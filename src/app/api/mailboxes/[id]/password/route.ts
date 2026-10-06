import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { domains, mailboxes, users } from "@/db/schema";
import { canManageUsers, isPrimaryAdmin } from "@/lib/auth/admin";
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
			ownerRole: users.role,
			ownerIsPrimaryAdmin: users.isPrimaryAdmin,
		})
		.from(mailboxes)
		.innerJoin(domains, eq(mailboxes.domainId, domains.id))
		.innerJoin(users, eq(mailboxes.userId, users.id))
		.where(and(eq(mailboxes.id, id), eq(mailboxes.organizationId, user.organizationId)))
		.limit(1);

	if (!row) return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });
	// A mailbox password signs in to webmail as the mailbox's owner. Only the
	// primary admin may set one for a mailbox owned by an admin, matching the
	// rule that only the primary admin manages admin accounts.
	if (!isPrimaryAdmin(user) && (row.ownerRole === "admin" || row.ownerIsPrimaryAdmin)) {
		return NextResponse.json({ error: "Only the primary admin can reset an admin's mailbox password" }, { status: 403 });
	}

	let password = generateMailboxPassword();
	try {
		const body = (await request.json()) as { password?: unknown };
		if (typeof body.password === "string" && body.password.length > 0) {
			if (body.password.length < 8 || body.password.length > 128) {
				return NextResponse.json({ error: "Password must be 8 to 128 characters" }, { status: 400 });
			}
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
