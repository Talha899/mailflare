interface CloudflareEnv {
	DB: D1Database;
	EMAIL: SendEmail;
	BUCKET: R2Bucket;
	INBOUND_QUEUE: Queue<import("./src/lib/email/inbound").InboundQueueMessage>;
	AGENT_QUEUE?: Queue<{ kind: "agent.draft"; jobId: string }>;
	AI_MODEL?: string;
	AI_BASE_URL?: string;
	AI_API_KEY?: string;
	// The outbound queue also carries webhook retries so that scheduled redelivery needs no extra binding.
	OUTBOUND_QUEUE: Queue<
		| import("./src/lib/email/send").OutboundQueueMessage
		| import("./src/lib/email/webhooks").WebhookRetryMessage
	>;
	ASSETS: Fetcher;
	IMAGES: ImagesBinding;
	WORKER_SELF_REFERENCE: Fetcher;
	REALTIME: DurableObjectNamespace<
		import("./src/lib/realtime/hub").RealtimeHub
	>;
	LOGIN_RATE_LIMIT?: RateLimit;
	AGENT_RATE_LIMIT?: RateLimit;
	GITHUB_UPDATE_TOKEN?: string;
	GITHUB_UPDATE_REF?: string;
	GITHUB_UPDATE_REPO?: string;
	/** "node" when served by the self-hosted runtime in server/. */
	MAILFLARE_RUNTIME?: "node";
	/** Shared secret for signed `/api/inbound` webhooks. */
	INBOUND_WEBHOOK_SECRET?: string;
	/** Public origin of this install (https://mail.example.com) when it sits behind a proxy. */
	APP_URL?: string;
	/**
	 * MongoDB connection for SaaS tenant metadata (organizations, domain
	 * verification, plan limits). Self-hosted / Docker only; unset on Workers.
	 */
	MONGO_URL?: string;
	/** Wired at Node boot when MONGO_URL is set; null when unavailable. */
	MONGO?: import("mongodb").Db | null;
	/**
	 * When "true", open multi-org signup is enabled (Node/Docker). Workers and
	 * classic single-tenant installs leave this unset/false.
	 */
	SAAS_MODE?: string;
}
