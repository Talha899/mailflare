import { createServer } from "node:http";
import { join, resolve } from "node:path";
import { parse } from "node:url";
import next from "next";
import { WebSocketServer } from "ws";
import { getUserFromSession } from "@/lib/auth/session";
import { getSessionTokenFromRequest } from "@/lib/realtime/utils";
import { processInboundMessage } from "@/lib/email/inbound";
import { processAgentDraftJob } from "@/lib/agent/jobs/utils";
import { processOutboundQueue, type OutboundQueueMessage } from "@/lib/email/send";
import { processWebhookRetry, type WebhookRetryMessage } from "@/lib/email/webhooks";
import { isInboundQueueMessage, isWebhookRetryMessage } from "../worker-utils";
import { createNodeRuntime, finalizeNodeRuntimeMongo } from "./runtime/env";
import { applyMigrations } from "./runtime/migrate";
import { s3ConfigFromEnv } from "./runtime/s3-bucket";
import { ensureOrganizationIndexes } from "@/lib/organizations/mongo-collections";
import { normalizeMailHostname } from "@/lib/domains/hostname";
import { startScheduler } from "./runtime/scheduler";
import { startSmtpListener } from "./runtime/smtp";
import { applyTrustedClientIp, isSameHostWebSocketOrigin } from "./runtime/client-ip";

/**
 * The self-hosted entrypoint: one Node process serving the Next app, the
 * realtime WebSocket, the SMTP listener, the job queues and the backup
 * schedule, the same jobs worker.ts spreads across Cloudflare products.
 */
async function main() {
	const port = Number(process.env.PORT ?? 3000);
	const host = process.env.HOST ?? "0.0.0.0";
	const dev = process.env.NODE_ENV !== "production";
	const runtime = createNodeRuntime();
	if (runtime.blobStore.kind === "s3") {
		await runtime.blobStore.ensureReady?.();
		const s3 = s3ConfigFromEnv();
		console.log(`Object storage: S3 (${s3?.bucket} @ ${s3?.endpoint})`);
	}
	await finalizeNodeRuntimeMongo(runtime);
	const { env } = runtime;
	globalThis.__mailflareNodeEnv = env;
	if (env.MONGO) {
		await ensureOrganizationIndexes(env.MONGO);
		console.log("MongoDB connected for SaaS tenant metadata");
	} else if (env.SAAS_MODE === "true") {
		console.warn("SAAS_MODE=true but MONGO_URL is unset; multi-org signup will fail until Mongo is available");
	}

	const migrated = await applyMigrations(runtime.database, resolve(process.env.MIGRATIONS_DIR ?? join(process.cwd(), "drizzle", "migrations")));
	if (migrated.length) console.log(`Applied ${migrated.length} migration(s): ${migrated.join(", ")}`);

	try {
		const { syncOutboundSenderDomains } = await import("@/lib/outbound/sender-domains");
		await syncOutboundSenderDomains(env);
	} catch (error) {
		console.warn("syncOutboundSenderDomains on boot", error);
	}

	runtime.inboundQueue.setConsumer(async (body) => {
		if (isInboundQueueMessage(body)) await processInboundMessage(env, body);
	});
	runtime.outboundQueue.setConsumer(async (body) => {
		if (isWebhookRetryMessage(body)) await processWebhookRetry(env, body as WebhookRetryMessage);
		else await processOutboundQueue(env, body as OutboundQueueMessage);
	});
	runtime.agentQueue.setConsumer(async (body) => {
		if (typeof body === "object" && body !== null && (body as { kind?: unknown }).kind === "agent.draft" && typeof (body as { jobId?: unknown }).jobId === "string") await processAgentDraftJob(env, (body as { jobId: string }).jobId);
	});

	const app = next({ dev, dir: process.cwd(), hostname: host, port });
	const handle = app.getRequestHandler();
	await app.prepare();

	const server = createServer((request, response) => {
		applyTrustedClientIp(request);
		void handle(request, response, parse(request.url ?? "/", true));
	});

	const wss = new WebSocketServer({ noServer: true });
	server.on("upgrade", (request, socket, head) => {
		const { pathname } = parse(request.url ?? "/");
		if (pathname !== "/api/realtime") {
			// Next's own dev-mode HMR socket, or anything else, is not ours.
			if (dev) app.getUpgradeHandler()(request, socket, head);
			else socket.destroy();
			return;
		}
		// Same rule as worker.ts: a cookie-authenticated socket must come from our own
		// pages, so a sibling subdomain cannot open it with the user's cookie.
		if (!isSameHostWebSocketOrigin(request.headers.origin, request.headers.host)) {
			socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
			socket.destroy();
			return;
		}
		const cookie = request.headers.cookie ?? "";
		const token = getSessionTokenFromRequest(new Request("http://localhost/", { headers: { cookie } }));
		void getUserFromSession(env, token).then((user) => {
			if (!user || user.disabled) {
				socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
				socket.destroy();
				return;
			}
			wss.handleUpgrade(request, socket, head, (ws) => runtime.realtime.attach(user.id, ws));
		});
	});

	server.listen(port, host, () => {
		console.log(`Dispatch listening on http://${host}:${port} (data in ${runtime.dataDir})`);
	});

	const smtpPort = Number(process.env.SMTP_INBOUND_PORT ?? 25);
	if (smtpPort > 0) {
		startSmtpListener(env, runtime.mailer, {
			port: smtpPort,
			host: process.env.SMTP_INBOUND_HOST,
			maxSize: Number(process.env.SMTP_MAX_SIZE ?? 36 * 1024 * 1024),
			hostname: normalizeMailHostname(process.env.MAIL_HOSTNAME ?? process.env.APP_URL ?? "mail.example.com") || "mail.example.com",
			tls: process.env.SMTP_TLS_KEY && process.env.SMTP_TLS_CERT ? { keyPath: process.env.SMTP_TLS_KEY, certPath: process.env.SMTP_TLS_CERT } : null,
		});
	}

	const mailHostname =
		normalizeMailHostname(process.env.MAIL_HOSTNAME ?? process.env.APP_URL ?? "mail.example.com") ||
		"mail.example.com";
	const tls =
		process.env.SMTP_TLS_KEY && process.env.SMTP_TLS_CERT
			? { keyPath: process.env.SMTP_TLS_KEY, certPath: process.env.SMTP_TLS_CERT }
			: null;

	const submissionPort = Number(process.env.SMTP_SUBMISSION_PORT ?? 587);
	if (submissionPort > 0) {
		const { startSmtpSubmissionServer } = await import("./runtime/smtp-submission");
		startSmtpSubmissionServer(env, {
			port: submissionPort,
			hostname: mailHostname,
			tls,
		});
	}
	const submissionTlsPort = Number(process.env.SMTP_SUBMISSION_TLS_PORT ?? 0);
	if (submissionTlsPort > 0 && tls) {
		const { startSmtpSubmissionServer } = await import("./runtime/smtp-submission");
		startSmtpSubmissionServer(env, {
			port: submissionTlsPort,
			hostname: mailHostname,
			secure: true,
			tls,
		});
	}

	const imapPort = Number(process.env.IMAP_PORT ?? 143);
	if (imapPort > 0) {
		const { startImapServer } = await import("./runtime/imap/server");
		startImapServer(env, { port: imapPort, hostname: mailHostname, tls });
		if (process.env.IMAP_ALLOW_INSECURE_AUTH !== "true") {
			console.log(
				`IMAP on port ${imapPort} is plain TCP, so sign-in is refused there. Clients should use IMAPS ` +
				"(set IMAPS_PORT with SMTP_TLS_KEY/SMTP_TLS_CERT), or set IMAP_ALLOW_INSECURE_AUTH=true when TLS is terminated in front.",
			);
		}
	}
	const imapsPort = Number(process.env.IMAPS_PORT ?? 0);
	if (imapsPort > 0 && tls) {
		const { startImapServer } = await import("./runtime/imap/server");
		startImapServer(env, { port: imapsPort, hostname: mailHostname, secure: true, tls });
	}

	const stopScheduler = startScheduler(env);

	const shutdown = () => {
		stopScheduler();
		runtime.inboundQueue.stop();
		runtime.outboundQueue.stop();
		runtime.agentQueue.stop();
		server.close(() => process.exit(0));
		setTimeout(() => process.exit(0), 5000).unref();
	};
	process.on("SIGTERM", shutdown);
	process.on("SIGINT", shutdown);
}

main().catch((error) => {
	console.error("Dispatch failed to start", error);
	process.exit(1);
});
