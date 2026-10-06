import { createServer, type Server, type Socket } from "node:net";
import { createServer as createTlsServer, type TlsOptions } from "node:tls";
import { readFileSync } from "node:fs";
import { authenticateMailboxAddress, type AuthenticatedMailbox } from "@/lib/mailboxes/credentials";
import {
	appendImapMessage,
	copyImapMessages,
	expungeImapMessages,
	IMAP_UIDVALIDITY,
	imapFlags,
	listFolderMessages,
	listImapFolders,
	loadRawMime,
	quoteImapString,
	resolveFolderSpec,
	SYSTEM_FOLDERS,
	type ImapFolderSpec,
	type ImapMessageRow,
	updateMessageFlags,
} from "./store";

type Session = {
	socket: Socket;
	tag: string;
	mailbox: AuthenticatedMailbox | null;
	folders: ImapFolderSpec[];
	selected: ImapFolderSpec | null;
	messages: ImapMessageRow[];
	authFailures: number;
	pendingPlainAuth: boolean;
	pendingAuthTag: string | null;
	pendingAppend: { tag: string; size: number; flags: string[]; dest: ImapFolderSpec } | null;
	commandChain: Promise<void>;
};

const globalAuthFailures = new Map<string, { count: number; resetAt: number }>();

function allowLogin(key: string): boolean {
	const now = Date.now();
	const row = globalAuthFailures.get(key);
	if (!row || row.resetAt < now) {
		globalAuthFailures.set(key, { count: 0, resetAt: now + 60_000 });
		return true;
	}
	return row.count < 20;
}

function failLogin(key: string): void {
	const now = Date.now();
	const row = globalAuthFailures.get(key) ?? { count: 0, resetAt: now + 60_000 };
	if (row.resetAt < now) {
		globalAuthFailures.set(key, { count: 1, resetAt: now + 60_000 });
		return;
	}
	row.count += 1;
	globalAuthFailures.set(key, row);
}

function write(socket: Socket, line: string): void {
	socket.write(`${line}\r\n`);
}

function parseLine(line: string): { tag: string; command: string; args: string } {
	const trimmed = line.replace(/\r$/, "").trim();
	const sp = trimmed.indexOf(" ");
	if (sp < 0) return { tag: trimmed, command: "", args: "" };
	const tag = trimmed.slice(0, sp);
	const rest = trimmed.slice(sp + 1);
	const sp2 = rest.indexOf(" ");
	if (sp2 < 0) return { tag, command: rest.toUpperCase(), args: "" };
	return { tag, command: rest.slice(0, sp2).toUpperCase(), args: rest.slice(sp2 + 1) };
}

function parseAtoms(args: string): string[] {
	const out: string[] = [];
	let i = 0;
	while (i < args.length) {
		while (args[i] === " ") i++;
		if (i >= args.length) break;
		if (args[i] === '"') {
			i++;
			let s = "";
			while (i < args.length && args[i] !== '"') {
				if (args[i] === "\\" && i + 1 < args.length) {
					s += args[i + 1];
					i += 2;
					continue;
				}
				s += args[i];
				i++;
			}
			i++;
			out.push(s);
		} else {
			let s = "";
			while (i < args.length && args[i] !== " ") {
				s += args[i];
				i++;
			}
			out.push(s);
		}
	}
	return out;
}

function decodePlainAuth(token: string): { user: string; pass: string } | null {
	try {
		const raw = Buffer.from(token, "base64").toString("utf8");
		const parts = raw.split("\0");
		if (parts.length >= 3) return { user: parts[1]!, pass: parts[2]! };
		if (parts.length === 2) return { user: parts[0]!, pass: parts[1]! };
		return null;
	} catch {
		return null;
	}
}

function uidSet(args: string, messages: ImapMessageRow[]): ImapMessageRow[] {
	const spec = args.trim().split(/\s+/)[0] ?? "";
	if (spec.toUpperCase() === "ALL" || spec === "*") return messages;
	const selected: ImapMessageRow[] = [];
	for (const part of spec.split(",")) {
		if (part.includes(":")) {
			const [a, b] = part.split(":");
			const start = a === "*" ? Math.max(...messages.map((m) => m.uid), 1) : Number(a);
			const end = b === "*" ? Math.max(...messages.map((m) => m.uid), 1) : Number(b);
			const lo = Math.min(start, end);
			const hi = Math.max(start, end);
			for (const m of messages) {
				if (m.uid >= lo && m.uid <= hi) selected.push(m);
			}
		} else {
			const uid = part === "*" ? Math.max(...messages.map((m) => m.uid), 1) : Number(part);
			const m = messages.find((row) => row.uid === uid);
			if (m) selected.push(m);
		}
	}
	return selected;
}

function sequenceSet(args: string, messages: ImapMessageRow[]): ImapMessageRow[] {
	const spec = args.trim().split(/\s+/)[0] ?? "";
	if (spec.toUpperCase() === "ALL" || spec === "*") return messages;
	const selected: ImapMessageRow[] = [];
	for (const part of spec.split(",")) {
		if (part.includes(":")) {
			const [a, b] = part.split(":");
			const start = a === "*" ? messages.length : Number(a);
			const end = b === "*" ? messages.length : Number(b);
			const lo = Math.min(start, end);
			const hi = Math.max(start, end);
			for (let i = lo; i <= hi; i++) {
				const m = messages[i - 1];
				if (m) selected.push(m);
			}
		} else {
			const seq = part === "*" ? messages.length : Number(part);
			const m = messages[seq - 1];
			if (m) selected.push(m);
		}
	}
	return selected;
}

function nextUid(messages: ImapMessageRow[]): number {
	return Math.max(0, ...messages.map((m) => m.uid)) + 1;
}

async function refreshSelected(env: CloudflareEnv, session: Session): Promise<void> {
	if (!session.mailbox || !session.selected) {
		session.messages = [];
		return;
	}
	session.messages = await listFolderMessages(env, session.mailbox, session.selected);
}

/**
 * Minimal IMAP4rev1 server for Postora mailboxes (Node runtime only).
 */
export function startImapServer(
	env: CloudflareEnv,
	options: {
		port: number;
		host?: string;
		secure?: boolean;
		tls: { keyPath: string; certPath: string } | null;
		hostname?: string;
	},
): Server {
	const handler = (socket: Socket) => {
		const session: Session = {
			socket,
			tag: "*",
			mailbox: null,
			folders: [],
			selected: null,
			messages: [],
			authFailures: 0,
			pendingPlainAuth: false,
			pendingAuthTag: null,
			pendingAppend: null,
			commandChain: Promise.resolve(),
		};
		write(socket, `* OK Postora IMAP ready`);
		let buffer = Buffer.alloc(0);
		socket.on("data", (chunk) => {
			buffer = Buffer.concat([buffer, chunk]);
			session.commandChain = session.commandChain.then(async () => {
				while (buffer.length > 0) {
					if (session.pendingAppend) {
						const need = session.pendingAppend.size;
						if (buffer.length < need) return;
						const literal = buffer.subarray(0, need);
						buffer = buffer.subarray(need);
						// optional CRLF after literal
						if (buffer[0] === 0x0d && buffer[1] === 0x0a) buffer = buffer.subarray(2);
						else if (buffer[0] === 0x0a) buffer = buffer.subarray(1);
						const pending = session.pendingAppend;
						session.pendingAppend = null;
						if (!session.mailbox) {
							write(socket, `${pending.tag} NO Not authenticated`);
							continue;
						}
						try {
							await appendImapMessage(
								env,
								session.mailbox,
								new Uint8Array(literal),
								pending.flags,
								pending.dest,
							);
							write(socket, `${pending.tag} OK APPEND completed`);
						} catch (error) {
							console.error("IMAP APPEND failed", error);
							write(socket, `${pending.tag} NO APPEND failed`);
						}
						continue;
					}
					const nl = buffer.indexOf(0x0a);
					if (nl < 0) return;
					const line = buffer.subarray(0, nl).toString("utf8");
					buffer = buffer.subarray(nl + 1);
					await handleCommand(env, session, line);
				}
			}).catch((error) => console.error("IMAP command chain error", error));
		});
		socket.on("error", (error) => console.error("IMAP socket error", error));
	};

	let server: Server;
	if (options.secure && options.tls) {
		const tlsOpts: TlsOptions = {
			key: readFileSync(options.tls.keyPath),
			cert: readFileSync(options.tls.certPath),
		};
		server = createTlsServer(tlsOpts, handler);
	} else {
		server = createServer(handler);
	}

	server.on("error", (error) => console.error("IMAP server error", error));
	server.listen(options.port, options.host ?? "0.0.0.0", () => {
		console.log(
			`IMAP listening on ${options.host ?? "0.0.0.0"}:${options.port}` +
				(options.secure ? " (TLS)" : ""),
		);
	});
	return server;
}

async function handleCommand(env: CloudflareEnv, session: Session, line: string): Promise<void> {
	const raw = line.replace(/\r$/, "").trim();
	if (session.pendingPlainAuth) {
		const tag = session.pendingAuthTag ?? "*";
		session.pendingPlainAuth = false;
		session.pendingAuthTag = null;
		if (raw === "*") {
			write(session.socket, `${tag} NO AUTHENTICATE cancelled`);
			return;
		}
		const decoded = decodePlainAuth(raw);
		if (!decoded) {
			write(session.socket, `${tag} NO AUTHENTICATE failed`);
			return;
		}
		await doLogin(env, session, tag, decoded.user, decoded.pass);
		return;
	}

	const { tag, command, args } = parseLine(line);
	session.tag = tag;
	const socket = session.socket;

	try {
		switch (command) {
			case "CAPABILITY":
				write(socket, `* CAPABILITY IMAP4rev1 AUTH=PLAIN`);
				write(socket, `${tag} OK CAPABILITY completed`);
				return;
			case "NOOP":
				write(socket, `${tag} OK NOOP completed`);
				return;
			case "LOGOUT":
				write(socket, `* BYE Postora logging out`);
				write(socket, `${tag} OK LOGOUT completed`);
				socket.end();
				return;
			case "LOGIN": {
				const atoms = parseAtoms(args);
				await doLogin(env, session, tag, atoms[0] ?? "", atoms[1] ?? "");
				return;
			}
			case "AUTHENTICATE": {
				const mech = args.trim().split(/\s+/)[0]?.toUpperCase();
				if (mech !== "PLAIN") {
					write(socket, `${tag} NO AUTHENTICATE failed`);
					return;
				}
				const inline = args.trim().split(/\s+/).slice(1).join("");
				if (inline) {
					const decoded = decodePlainAuth(inline);
					if (!decoded) {
						write(socket, `${tag} NO AUTHENTICATE failed`);
						return;
					}
					await doLogin(env, session, tag, decoded.user, decoded.pass);
					return;
				}
				session.pendingPlainAuth = true;
				session.pendingAuthTag = tag;
				write(socket, "+ ");
				return;
			}
			case "LIST":
			case "LSUB": {
				if (!session.mailbox) {
					write(socket, `${tag} NO Not authenticated`);
					return;
				}
				session.folders = await listImapFolders(env, session.mailbox);
				for (const folder of session.folders) {
					const attrs = folder.attributes.length ? `(${folder.attributes.join(" ")})` : "()";
					write(socket, `* LIST ${attrs} "/" ${quoteImapString(folder.name)}`);
				}
				write(socket, `${tag} OK LIST completed`);
				return;
			}
			case "SELECT":
			case "EXAMINE": {
				if (!session.mailbox) {
					write(socket, `${tag} NO Not authenticated`);
					return;
				}
				session.folders = await listImapFolders(env, session.mailbox);
				const name = parseAtoms(args)[0] ?? args.trim();
				const spec = resolveFolderSpec(name, session.folders);
				if (!spec) {
					write(socket, `${tag} NO Mailbox does not exist`);
					return;
				}
				session.selected = spec;
				await refreshSelected(env, session);
				const unseen = session.messages.filter((m) => !m.read).length;
				write(socket, `* ${session.messages.length} EXISTS`);
				write(socket, `* 0 RECENT`);
				write(socket, `* OK [UNSEEN ${unseen || 0}]`);
				write(socket, `* OK [UIDVALIDITY ${IMAP_UIDVALIDITY}] UIDs valid`);
				write(socket, `* OK [UIDNEXT ${nextUid(session.messages)}] Predicted next UID`);
				write(socket, `* FLAGS (\\Seen \\Answered \\Flagged \\Deleted \\Draft)`);
				write(socket, `* OK [PERMANENTFLAGS (\\Seen \\Flagged \\Deleted \\Draft \\*)] Limited`);
				write(
					socket,
					`${tag} OK [READ-${command === "EXAMINE" ? "ONLY" : "WRITE"}] ${command} completed`,
				);
				return;
			}
			case "CLOSE":
				if (session.mailbox && session.selected) {
					await refreshSelected(env, session);
					await expungeImapMessages(env, session.mailbox, session.messages);
				}
				session.selected = null;
				session.messages = [];
				write(socket, `${tag} OK CLOSE completed`);
				return;
			case "EXPUNGE": {
				if (!session.selected || !session.mailbox) {
					write(socket, `${tag} NO No mailbox selected`);
					return;
				}
				await refreshSelected(env, session);
				const before = session.messages;
				const deleted = before.filter((m) => m.status === "trash");
				for (let i = before.length - 1; i >= 0; i--) {
					if (before[i]!.status === "trash") {
						write(socket, `* ${i + 1} EXPUNGE`);
					}
				}
				await expungeImapMessages(env, session.mailbox, deleted);
				await refreshSelected(env, session);
				write(socket, `${tag} OK EXPUNGE completed`);
				return;
			}
			case "FETCH": {
				if (!session.selected) {
					write(socket, `${tag} NO No mailbox selected`);
					return;
				}
				await refreshSelected(env, session);
				const space = args.search(/\s+\(/);
				const setPart = space >= 0 ? args.slice(0, space) : args.split(/\s+/)[0] ?? "";
				const itemsPart = space >= 0 ? args.slice(space).trim() : args.slice(setPart.length).trim();
				for (const row of sequenceSet(setPart, session.messages)) {
					const seq = session.messages.indexOf(row) + 1;
					await emitFetch(env, session, row, itemsPart, seq);
				}
				write(socket, `${tag} OK FETCH completed`);
				return;
			}
			case "UID": {
				if (!session.selected) {
					write(socket, `${tag} NO No mailbox selected`);
					return;
				}
				const sub = args.trim();
				const subCmd = sub.split(/\s+/)[0]?.toUpperCase() ?? "";
				const subArgs = sub.slice(subCmd.length).trim();
				if (subCmd === "FETCH") {
					await refreshSelected(env, session);
					const space = subArgs.search(/\s+\(/);
					const setPart = space >= 0 ? subArgs.slice(0, space) : subArgs.split(/\s+/)[0] ?? "";
					const itemsPart = space >= 0 ? subArgs.slice(space).trim() : subArgs.slice(setPart.length).trim();
					for (const row of uidSet(setPart, session.messages)) {
						const seq = session.messages.indexOf(row) + 1;
						await emitFetch(env, session, row, itemsPart.includes("UID") ? itemsPart : `${itemsPart} UID`, seq);
					}
					write(socket, `${tag} OK UID FETCH completed`);
					return;
				}
				if (subCmd === "STORE") {
					await handleStore(env, session, tag, subArgs, true);
					return;
				}
				if (subCmd === "SEARCH") {
					await refreshSelected(env, session);
					const upper = subArgs.toUpperCase();
					let rows = session.messages;
					if (upper.includes("UNSEEN")) rows = rows.filter((m) => !m.read);
					if (upper.includes("SEEN")) rows = rows.filter((m) => m.read);
					if (upper.includes("FLAGGED")) rows = rows.filter((m) => m.starred);
					if (upper.includes("ALL") || !upper.trim()) rows = session.messages;
					write(socket, `* SEARCH ${rows.map((m) => m.uid).join(" ")}`.trimEnd());
					write(socket, `${tag} OK UID SEARCH completed`);
					return;
				}
				if (subCmd === "COPY") {
					if (!session.mailbox) {
						write(socket, `${tag} NO Not authenticated`);
						return;
					}
					await refreshSelected(env, session);
					const atoms = parseAtoms(subArgs);
					const setPart = atoms[0] ?? "";
					const destName = atoms[1] ?? "";
					session.folders = await listImapFolders(env, session.mailbox);
					const dest = resolveFolderSpec(destName, session.folders);
					if (!dest) {
						write(socket, `${tag} NO [TRYCREATE] Mailbox does not exist`);
						return;
					}
					const rows = uidSet(setPart, session.messages);
					await copyImapMessages(env, session.mailbox, rows, dest);
					write(socket, `${tag} OK UID COPY completed`);
					return;
				}
				write(socket, `${tag} BAD UID command not supported`);
				return;
			}
			case "STORE":
				await handleStore(env, session, tag, args, false);
				return;
			case "SEARCH": {
				if (!session.selected) {
					write(socket, `${tag} NO No mailbox selected`);
					return;
				}
				await refreshSelected(env, session);
				const upper = args.toUpperCase();
				let rows = session.messages;
				if (upper.includes("UNSEEN")) rows = rows.filter((m) => !m.read);
				if (upper.includes("SEEN")) rows = rows.filter((m) => m.read);
				if (upper.includes("FLAGGED")) rows = rows.filter((m) => m.starred);
				write(
					socket,
					`* SEARCH ${rows.map((m) => session.messages.indexOf(m) + 1).join(" ")}`.trimEnd(),
				);
				write(socket, `${tag} OK SEARCH completed`);
				return;
			}
			case "STATUS": {
				if (!session.mailbox) {
					write(socket, `${tag} NO Not authenticated`);
					return;
				}
				session.folders = await listImapFolders(env, session.mailbox);
				const name = parseAtoms(args)[0] ?? "";
				const spec = resolveFolderSpec(name, session.folders);
				if (!spec) {
					write(socket, `${tag} NO Mailbox does not exist`);
					return;
				}
				const rows = await listFolderMessages(env, session.mailbox, spec);
				const unseen = rows.filter((m) => !m.read).length;
				write(
					socket,
					`* STATUS ${quoteImapString(spec.name)} (MESSAGES ${rows.length} UNSEEN ${unseen} UIDNEXT ${nextUid(rows)})`,
				);
				write(socket, `${tag} OK STATUS completed`);
				return;
			}
			case "APPEND": {
				if (!session.mailbox) {
					write(socket, `${tag} NO Not authenticated`);
					return;
				}
				const literalMatch = args.match(/\{(\d+)\}\s*$/);
				if (!literalMatch) {
					write(socket, `${tag} NO APPEND requires a literal`);
					return;
				}
				const size = Number(literalMatch[1]);
				const flagMatch = args.match(/\(([^)]*)\)/);
				const flags = flagMatch
					? flagMatch[1]!.split(/\s+/).filter(Boolean)
					: ["\\Draft"];
				session.folders = await listImapFolders(env, session.mailbox);
				const destName = parseAtoms(args)[0] ?? "Drafts";
				const dest =
					resolveFolderSpec(destName, session.folders) ??
					SYSTEM_FOLDERS.find((f) => f.name === "Drafts")!;
				session.pendingAppend = { tag, size, flags, dest };
				write(socket, "+ Ready for literal data");
				return;
			}
			case "COPY": {
				if (!session.selected || !session.mailbox) {
					write(socket, `${tag} NO No mailbox selected`);
					return;
				}
				await refreshSelected(env, session);
				const atoms = parseAtoms(args);
				const setPart = atoms[0] ?? "";
				const destName = atoms[1] ?? "";
				session.folders = await listImapFolders(env, session.mailbox);
				const dest = resolveFolderSpec(destName, session.folders);
				if (!dest) {
					write(socket, `${tag} NO [TRYCREATE] Mailbox does not exist`);
					return;
				}
				const rows = sequenceSet(setPart, session.messages);
				await copyImapMessages(env, session.mailbox, rows, dest);
				write(socket, `${tag} OK COPY completed`);
				return;
			}
			default:
				write(socket, `${tag} BAD Command not supported`);
		}
	} catch (error) {
		console.error("IMAP command failed", command, error);
		write(socket, `${tag} NO Server error`);
	}
}

async function doLogin(
	env: CloudflareEnv,
	session: Session,
	tag: string,
	user: string,
	pass: string,
): Promise<void> {
	const key = user.toLowerCase() || "unknown";
	if (!allowLogin(key)) {
		write(session.socket, `${tag} NO [UNAVAILABLE] Too many failures`);
		return;
	}
	const mailbox = await authenticateMailboxAddress(env, user, pass);
	if (!mailbox) {
		failLogin(key);
		write(session.socket, `${tag} NO [AUTHENTICATIONFAILED] Invalid credentials`);
		return;
	}
	session.mailbox = mailbox;
	session.folders = await listImapFolders(env, mailbox);
	write(session.socket, `${tag} OK LOGIN completed`);
}

async function emitFetch(
	env: CloudflareEnv,
	session: Session,
	row: ImapMessageRow,
	itemsPart: string,
	sequence: number,
): Promise<void> {
	const upper = itemsPart.toUpperCase();
	const wantFlags = upper.includes("FLAGS") || upper.includes("ALL") || upper.includes("FULL") || upper.includes("FAST");
	const wantUid = upper.includes("UID") || upper.includes("ALL") || upper.includes("FULL");
	const wantEnv = upper.includes("ENVELOPE") || upper.includes("ALL") || upper.includes("FULL");
	const wantStructure = upper.includes("BODYSTRUCTURE") || upper.includes("ALL") || upper.includes("FULL");
	const wantBody =
		upper.includes("BODY[]") ||
		upper.includes("BODY.PEEK[]") ||
		upper.includes("RFC822") ||
		upper.includes("FULL");
	const wantSize = upper.includes("RFC822.SIZE") || upper.includes("ALL") || upper.includes("FULL");

	let body: Uint8Array | null = null;
	if (wantBody || wantSize || wantStructure) {
		body = await loadRawMime(env, row);
	}

	const parts: string[] = [];
	if (wantFlags) parts.push(`FLAGS (${imapFlags(row).join(" ")})`);
	if (wantUid) parts.push(`UID ${row.uid}`);
	if (wantEnv) {
		const date = row.createdAt.toUTCString();
		parts.push(
			`ENVELOPE (${quoteImapString(date)} ${quoteImapString(row.subject ?? "")} ` +
				`((NIL NIL ${quoteImapString(row.fromAddr)} NIL)) ` +
				`((NIL NIL ${quoteImapString(row.fromAddr)} NIL)) ` +
				`((NIL NIL ${quoteImapString(row.fromAddr)} NIL)) ` +
				`((NIL NIL ${quoteImapString(row.toAddr)} NIL)) NIL NIL NIL ` +
				`${quoteImapString(row.providerMessageId ?? row.id)})`,
		);
	}
	if (wantStructure) {
		const size = body?.byteLength ?? 0;
		const lines = String(row.textBody ?? "").split("\n").length;
		parts.push(
			`BODYSTRUCTURE ("TEXT" "PLAIN" ("CHARSET" "UTF-8") NIL NIL "7BIT" ${size} ${lines} NIL NIL NIL NIL)`,
		);
	}
	if (wantSize && body) parts.push(`RFC822.SIZE ${body.byteLength}`);
	if (wantBody && body) {
		const text = Buffer.from(body).toString("binary");
		parts.push(`BODY[] {${body.byteLength}}\r\n${text}`);
	}

	write(session.socket, `* ${sequence} FETCH (${parts.join(" ")})`);
}

async function handleStore(
	env: CloudflareEnv,
	session: Session,
	tag: string,
	args: string,
	byUid: boolean,
): Promise<void> {
	if (!session.selected || !session.mailbox) {
		write(session.socket, `${tag} NO No mailbox selected`);
		return;
	}
	await refreshSelected(env, session);
	const match = args.match(/^(\S+)\s+(\S+)\s+\(([^)]*)\)/i);
	if (!match) {
		write(session.socket, `${tag} BAD Invalid STORE`);
		return;
	}
	const [, setPart, mode, flagList] = match;
	const rows = byUid
		? uidSet(setPart!, session.messages)
		: sequenceSet(setPart!, session.messages);
	const flags = flagList!.toUpperCase();
	const remove = mode!.includes("-");
	for (const row of rows) {
		const next: { read?: boolean; starred?: boolean; status?: string } = {};
		if (flags.includes("\\SEEN")) next.read = remove ? false : true;
		if (flags.includes("\\FLAGGED")) next.starred = remove ? false : true;
		if (flags.includes("\\DELETED") && !remove) next.status = "trash";
		await updateMessageFlags(env, row.id, session.mailbox.mailboxId, next);
		const merged = {
			...row,
			read: next.read ?? row.read,
			starred: next.starred ?? row.starred,
			status: next.status ?? row.status,
		};
		const seq = session.messages.indexOf(row) + 1;
		write(session.socket, `* ${seq} FETCH (FLAGS (${imapFlags(merged).join(" ")}))`);
	}
	write(session.socket, `${tag} OK STORE completed`);
}
