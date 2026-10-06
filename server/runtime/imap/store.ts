import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { folders, messages } from "@/db/schema";
import type { AuthenticatedMailbox } from "@/lib/mailboxes/credentials";
import { deleteMessageWithObjects } from "@/lib/email/message-cleanup";

export type ImapFolderSpec = {
	name: string;
	/** Message status filter, or null when filtering by custom folderId */
	status: string | null;
	folderId: string | null;
	attributes: string[];
};

export const SYSTEM_FOLDERS: ImapFolderSpec[] = [
	{ name: "INBOX", status: "received", folderId: null, attributes: ["\\HasNoChildren"] },
	{ name: "Sent", status: "sent", folderId: null, attributes: ["\\Sent", "\\HasNoChildren"] },
	{ name: "Drafts", status: "draft", folderId: null, attributes: ["\\Drafts", "\\HasNoChildren"] },
	{ name: "Trash", status: "trash", folderId: null, attributes: ["\\Trash", "\\HasNoChildren"] },
	{ name: "Junk", status: "spam", folderId: null, attributes: ["\\Junk", "\\HasNoChildren"] },
	{ name: "Archive", status: "archived", folderId: null, attributes: ["\\Archive", "\\HasNoChildren"] },
];

/** Bump when UID assignment scheme changes so clients resync. */
export const IMAP_UIDVALIDITY = 2;

/** Stable positive IMAP UID derived from message id (not sequence position). */
export function stableImapUid(messageId: string): number {
	let hash = 2166136261;
	for (let i = 0; i < messageId.length; i++) {
		hash ^= messageId.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0) % 2147483646 + 1;
}

export async function listImapFolders(
	env: CloudflareEnv,
	mailbox: AuthenticatedMailbox,
): Promise<ImapFolderSpec[]> {
	const db = getDb(env);
	const custom = await db
		.select({ id: folders.id, name: folders.name })
		.from(folders)
		.where(eq(folders.mailboxId, mailbox.mailboxId))
		.orderBy(asc(folders.name));
	return [
		...SYSTEM_FOLDERS,
		...custom.map((folder) => ({
			name: folder.name.replace(/[\/\]]/g, "_"),
			status: null as string | null,
			folderId: folder.id,
			attributes: ["\\HasNoChildren"],
		})),
	];
}

export function resolveFolderSpec(name: string, specs: ImapFolderSpec[]): ImapFolderSpec | null {
	const needle = name.replace(/^"/, "").replace(/"$/, "");
	return specs.find((s) => s.name.toLowerCase() === needle.toLowerCase()) ?? null;
}

export type ImapMessageRow = {
	id: string;
	uid: number;
	subject: string | null;
	fromAddr: string;
	toAddr: string;
	ccAddr: string | null;
	snippet: string | null;
	textBody: string | null;
	htmlBody: string | null;
	rawR2Key: string | null;
	read: boolean;
	starred: boolean;
	status: string;
	createdAt: Date;
	providerMessageId: string | null;
	inReplyTo: string | null;
};

export async function listFolderMessages(
	env: CloudflareEnv,
	mailbox: AuthenticatedMailbox,
	spec: ImapFolderSpec,
): Promise<ImapMessageRow[]> {
	const db = getDb(env);
	const conditions = [eq(messages.mailboxId, mailbox.mailboxId)];
	if (spec.folderId) {
		conditions.push(eq(messages.folderId, spec.folderId));
	} else if (spec.status === "received") {
		conditions.push(eq(messages.status, "received"), isNull(messages.folderId));
	} else if (spec.status) {
		conditions.push(eq(messages.status, spec.status));
	}

	const rows = await db
		.select({
			id: messages.id,
			subject: messages.subject,
			fromAddr: messages.fromAddr,
			toAddr: messages.toAddr,
			ccAddr: messages.ccAddr,
			snippet: messages.snippet,
			textBody: messages.textBody,
			htmlBody: messages.htmlBody,
			rawR2Key: messages.rawR2Key,
			read: messages.read,
			starred: messages.starred,
			status: messages.status,
			createdAt: messages.createdAt,
			providerMessageId: messages.providerMessageId,
			inReplyTo: messages.inReplyTo,
		})
		.from(messages)
		.where(and(...conditions))
		.orderBy(asc(messages.createdAt), asc(messages.id));

	return rows.map((row) => ({
		...row,
		uid: stableImapUid(row.id),
		createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
	}));
}

export async function updateMessageFlags(
	env: CloudflareEnv,
	messageId: string,
	mailboxId: string,
	flags: { read?: boolean; starred?: boolean; status?: string },
): Promise<void> {
	const db = getDb(env);
	await db
		.update(messages)
		.set({
			...(typeof flags.read === "boolean" ? { read: flags.read } : {}),
			...(typeof flags.starred === "boolean" ? { starred: flags.starred } : {}),
			...(flags.status ? { status: flags.status, folderId: null } : {}),
		})
		.where(and(eq(messages.id, messageId), eq(messages.mailboxId, mailboxId)));
}

export function imapFlags(row: ImapMessageRow): string[] {
	const flags: string[] = [];
	if (row.read) flags.push("\\Seen");
	if (row.starred) flags.push("\\Flagged");
	if (row.status === "draft") flags.push("\\Draft");
	if (row.status === "trash") flags.push("\\Deleted");
	return flags;
}

export async function loadRawMime(
	env: CloudflareEnv,
	row: ImapMessageRow,
): Promise<Uint8Array> {
	if (row.rawR2Key) {
		const object = await env.BUCKET.get(row.rawR2Key);
		if (object) {
			const buf = await object.arrayBuffer();
			return new Uint8Array(buf);
		}
	}
	const subject = row.subject ?? "";
	const text = row.textBody ?? row.snippet ?? "";
	const html = row.htmlBody;
	const date = row.createdAt.toUTCString();
	const messageId = row.providerMessageId
		? `<${row.providerMessageId.replace(/^<|>$/g, "")}>`
		: `<${row.id}@mailflare.local>`;
	const lines = [
		`From: ${row.fromAddr}`,
		`To: ${row.toAddr}`,
		row.ccAddr ? `Cc: ${row.ccAddr}` : null,
		`Subject: ${subject}`,
		`Date: ${date}`,
		`Message-ID: ${messageId}`,
		row.inReplyTo ? `In-Reply-To: <${row.inReplyTo}>` : null,
		"MIME-Version: 1.0",
	].filter(Boolean) as string[];

	if (html) {
		lines.push('Content-Type: text/html; charset="utf-8"', "", html);
	} else {
		lines.push('Content-Type: text/plain; charset="utf-8"', "", text);
	}
	return new TextEncoder().encode(lines.join("\r\n"));
}

export function quoteImapString(value: string): string {
	return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function destinationFields(dest: ImapFolderSpec): {
	status: string;
	folderId: string | null;
} {
	if (dest.folderId) return { status: "received", folderId: dest.folderId };
	return { status: dest.status ?? "draft", folderId: null };
}

export async function appendImapMessage(
	env: CloudflareEnv,
	mailbox: AuthenticatedMailbox,
	raw: Uint8Array,
	flags: string[],
	dest: ImapFolderSpec,
): Promise<void> {
	const { parseRawMime } = await import("@/lib/email/parse");
	const { newId } = await import("@/lib/ids");
	const { buildSnippet } = await import("@/lib/email/parse");
	const parsed = await parseRawMime(
		raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer,
	);
	const id = newId("msg");
	const db = getDb(env);
	const key = `imap-append/${mailbox.mailboxId}/${id}.eml`;
	await env.BUCKET.put(key, raw);
	const { status, folderId } = destinationFields(dest);
	const upperFlags = flags.map((f) => f.toUpperCase());
	await db.insert(messages).values({
		id,
		userId: mailbox.userId,
		mailboxId: mailbox.mailboxId,
		direction: status === "draft" ? "outbound" : "inbound",
		fromAddr: parsed.fromAddr ?? mailbox.address,
		toAddr: parsed.toAddr ?? "",
		ccAddr: parsed.ccAddr,
		bccAddr: parsed.bccAddr,
		subject: parsed.subject,
		snippet: buildSnippet(parsed.text, parsed.html),
		textBody: parsed.text,
		htmlBody: parsed.html,
		rawR2Key: key,
		status,
		folderId,
		read: upperFlags.includes("\\SEEN") || status === "draft",
		starred: upperFlags.includes("\\FLAGGED"),
		providerMessageId: parsed.messageId,
		inReplyTo: parsed.inReplyTo,
	});
}

/** @deprecated use appendImapMessage with a destination folder */
export async function appendImapDraft(
	env: CloudflareEnv,
	mailbox: AuthenticatedMailbox,
	raw: Uint8Array,
	flags: string[],
): Promise<void> {
	await appendImapMessage(env, mailbox, raw, flags, SYSTEM_FOLDERS.find((f) => f.name === "Drafts")!);
}

export async function moveImapMessages(
	env: CloudflareEnv,
	mailbox: AuthenticatedMailbox,
	messageIds: string[],
	dest: ImapFolderSpec,
): Promise<void> {
	const db = getDb(env);
	const { status, folderId } = destinationFields(dest);
	for (const id of messageIds) {
		await db
			.update(messages)
			.set({ status, folderId })
			.where(and(eq(messages.id, id), eq(messages.mailboxId, mailbox.mailboxId)));
	}
}

/** True IMAP COPY — duplicates rows (and raw MIME) into the destination folder. */
export async function copyImapMessages(
	env: CloudflareEnv,
	mailbox: AuthenticatedMailbox,
	sourceRows: ImapMessageRow[],
	dest: ImapFolderSpec,
): Promise<void> {
	const { newId } = await import("@/lib/ids");
	const db = getDb(env);
	const { status, folderId } = destinationFields(dest);

	for (const row of sourceRows) {
		const id = newId("msg");
		let rawR2Key: string | null = null;
		if (row.rawR2Key) {
			const object = await env.BUCKET.get(row.rawR2Key);
			if (object) {
				rawR2Key = `imap-copy/${mailbox.mailboxId}/${id}.eml`;
				await env.BUCKET.put(rawR2Key, await object.arrayBuffer());
			}
		}
		await db.insert(messages).values({
			id,
			userId: mailbox.userId,
			mailboxId: mailbox.mailboxId,
			direction: row.status === "sent" || row.status === "draft" ? "outbound" : "inbound",
			fromAddr: row.fromAddr,
			toAddr: row.toAddr,
			ccAddr: row.ccAddr,
			subject: row.subject,
			snippet: row.snippet,
			textBody: row.textBody,
			htmlBody: row.htmlBody,
			rawR2Key,
			status,
			folderId,
			read: row.read,
			starred: row.starred,
			providerMessageId: row.providerMessageId,
			inReplyTo: row.inReplyTo,
			createdAt: row.createdAt,
		});
	}
}

/** Permanently delete messages marked \\Deleted (status trash) in the selected folder. */
export async function expungeImapMessages(
	env: CloudflareEnv,
	mailbox: AuthenticatedMailbox,
	rows: ImapMessageRow[],
): Promise<number> {
	const db = getDb(env);
	let count = 0;
	for (const row of rows) {
		if (row.status !== "trash") continue;
		await deleteMessageWithObjects(env, db, row.id, row.rawR2Key);
		count += 1;
	}
	return count;
}
