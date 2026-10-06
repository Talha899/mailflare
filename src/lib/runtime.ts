/**
 * The self-hosted Node server builds an env object and publishes it on
 * globalThis before Next starts, so route handlers reach bindings the same way.
 */
declare global {
	var __mailflareNodeEnv: CloudflareEnv | undefined;
}

export function getNodeEnv(): CloudflareEnv | undefined {
	return globalThis.__mailflareNodeEnv;
}

export function isNodeRuntime(env?: Pick<CloudflareEnv, "MAILFLARE_RUNTIME">): boolean {
	return (env ?? getNodeEnv())?.MAILFLARE_RUNTIME === "node";
}

/** Always false — DNS is configured by hand (Coolify / Postfix / any DNS panel). */
export function hasCloudflareCredentials(_env?: CloudflareEnv): boolean {
	return false;
}

/** True when open multi-org signup is enabled (Docker/Node SaaS). */
export function isSaasModeEnabled(env?: Pick<CloudflareEnv, "SAAS_MODE">): boolean {
	const raw =
		env !== undefined
			? env.SAAS_MODE
			: getNodeEnv()?.SAAS_MODE ??
				(typeof process !== "undefined" ? process.env?.SAAS_MODE : undefined);
	const value = typeof raw === "string" ? raw.trim() : "";
	return value === "true" || value === "1";
}
