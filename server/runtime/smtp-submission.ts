import { readFileSync } from "node:fs";
import { SMTPServer } from "smtp-server";
import type { SMTPServerAuthentication, SMTPServerSession } from "smtp-server";
import { sendEmail } from "@/lib/email/send";
import { parseRawMime } from "@/lib/email/parse";
import { getEmailAddress } from "@/lib/email/address";
import {
	authenticateMailboxAddress,
	type AuthenticatedMailbox,
} from "@/lib/mailboxes/credentials";

type AuthSession = SMTPServerSession & { mailbox?: AuthenticatedMailbox };

const authFailures = new Map<string, { count: number; resetAt: number }>();

function allowAuthAttempt(key: string): boolean {
	const now = Date.now();
	const row = authFailures.get(key);
	if (!row || row.resetAt < now) {
		authFailures.set(key, { count: 0, resetAt: now + 60_000 });
		return true;
	}
	return row.count < 20;
}

function recordAuthFailure(key: string): void {
	const now = Date.now();
	const row = authFailures.get(key) ?? { count: 0, resetAt: now + 60_000 };
	if (row.resetAt < now) {
		authFailures.set(key, { count: 1, resetAt: now + 60_000 });
		return;
	}
	row.count += 1;
	authFailures.set(key, row);
}

/**
 * Authenticated SMTP submission for mailboxes (ports 587 / optional 465).
 * Wired to the same sendEmail pipeline as the web UI.
 */
export function startSmtpSubmissionServer(
	env: CloudflareEnv,
	options: {
		port: number;
		host?: string;
		hostname?: string;
		secure?: boolean;
		tls: { keyPath: string; certPath: string } | null;
	},
) {
	const server = new SMTPServer({
		name: options.hostname ?? "Dispatch",
		secure: options.secure ?? false,
		authOptional: false,
		disabledCommands: options.secure || options.tls ? [] : ["STARTTLS"],
		...(options.tls
			? { key: readFileSync(options.tls.keyPath), cert: readFileSync(options.tls.certPath) }
			: {}),
		size: Number(process.env.SMTP_MAX_SIZE ?? 36 * 1024 * 1024),
		banner: "Dispatch submission",
		onAuth(auth: SMTPServerAuthentication, _session, callback) {
			const username = (auth.username ?? "").trim().toLowerCase();
			const password = auth.password ?? "";
			const rateKey = username || "unknown";
			if (!allowAuthAttempt(rateKey)) {
				callback(Object.assign(new Error("Too many auth failures"), { responseCode: 421 }));
				return;
			}
			void authenticateMailboxAddress(env, username, password).then((mailbox) => {
				if (!mailbox) {
					recordAuthFailure(rateKey);
					callback(new Error("Invalid username or password"));
					return;
				}
				callback(null, { user: mailbox.address });
			});
		},
		onConnect(session, callback) {
			callback();
		},
		onMailFrom(address, session: AuthSession, callback) {
			const from = address.address.trim().toLowerCase();
			const username = session.user?.toLowerCase?.() ?? "";
			if (!username) {
				callback(Object.assign(new Error("Authentication required"), { responseCode: 530 }));
				return;
			}
			void authenticateSessionMailbox(env, session, username).then((mailbox) => {
				if (!mailbox) {
					callback(Object.assign(new Error("Authentication required"), { responseCode: 530 }));
					return;
				}
				session.mailbox = mailbox;
				const authorized = from === mailbox.address.toLowerCase();
				if (!authorized) {
					callback(Object.assign(new Error("Sender not allowed"), { responseCode: 550 }));
					return;
				}
				callback();
			});
		},
		onData(stream, session: AuthSession, callback) {
			const chunks: Buffer[] = [];
			stream.on("data", (chunk: Buffer) => chunks.push(chunk));
			stream.on("end", () => {
				void (async () => {
					try {
						if (stream.sizeExceeded) {
							callback(Object.assign(new Error("Message too large"), { responseCode: 552 }));
							return;
						}
						const mailbox = session.mailbox;
						if (!mailbox) {
							callback(Object.assign(new Error("Authentication required"), { responseCode: 530 }));
							return;
						}
						const raw = Buffer.concat(chunks);
						const parsed = await parseRawMime(toArrayBuffer(raw));
						const to =
							session.envelope.rcptTo.map((r) => r.address).filter(Boolean).join(", ") ||
							parsed.toAddr ||
							"";
						if (!to) {
							callback(Object.assign(new Error("No recipients"), { responseCode: 554 }));
							return;
						}
						const fromAddr = getEmailAddress(parsed.fromAddr) || mailbox.address;
						await sendEmail(env, {
							userId: mailbox.userId,
							mailboxId: mailbox.mailboxId,
							from: fromAddr,
							to,
							cc: parsed.ccAddr ?? undefined,
							bcc: parsed.bccAddr ?? undefined,
							subject: parsed.subject ?? "(no subject)",
							html: parsed.html ?? undefined,
							text: parsed.text ?? undefined,
							inReplyTo: parsed.inReplyTo,
							references: parsed.references,
							attachments: parsed.attachments.filter((a) => a.disposition !== "inline" || !a.contentId),
						});
						callback();
					} catch (error) {
						console.error("SMTP submission failed", error);
						const message = error instanceof Error ? error.message : "Send failed";
						callback(Object.assign(new Error(message), { responseCode: 554 }));
					}
				})();
			});
		},
	});

	server.on("error", (error) => console.error("SMTP submission error", error));
	server.listen(options.port, options.host ?? "0.0.0.0", () => {
		console.log(
			`SMTP submission listening on ${options.host ?? "0.0.0.0"}:${options.port}` +
				(options.secure ? " (TLS)" : ""),
		);
	});
	return server;
}

async function authenticateSessionMailbox(
	env: CloudflareEnv,
	session: AuthSession,
	username: string,
): Promise<AuthenticatedMailbox | null> {
	if (session.mailbox && session.mailbox.address.toLowerCase() === username) {
		return session.mailbox;
	}
	// Password already verified in onAuth; re-resolve mailbox row without re-checking password
	// by looking up via a no-op path — re-auth with empty is wrong. Store mailbox on session.user only.
	const { getDb } = await import("@/db");
	const { mailboxes, domains } = await import("@/db/schema");
	const { and, eq } = await import("drizzle-orm");
	const at = username.lastIndexOf("@");
	if (at <= 0) return null;
	const localPart = username.slice(0, at);
	const hostname = username.slice(at + 1);
	const db = getDb(env);
	const [row] = await db
		.select({
			mailboxId: mailboxes.id,
			userId: mailboxes.userId,
			organizationId: mailboxes.organizationId,
			localPart: mailboxes.localPart,
			hostname: domains.hostname,
			disabled: mailboxes.disabled,
		})
		.from(mailboxes)
		.innerJoin(domains, eq(mailboxes.domainId, domains.id))
		.where(and(eq(domains.hostname, hostname), eq(mailboxes.localPart, localPart)))
		.limit(1);
	if (!row || row.disabled) return null;
	return {
		mailboxId: row.mailboxId,
		userId: row.userId,
		organizationId: row.organizationId,
		localPart: row.localPart,
		hostname: row.hostname,
		address: `${row.localPart}@${row.hostname}`,
		disabled: row.disabled,
	};
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
	return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}
