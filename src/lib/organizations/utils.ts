import { isSaasMode } from "./service";

/** Default organization id used when backfilling single-tenant installs. */
export const DEFAULT_ORGANIZATION_ID = "org_default";

export function saasModeEnabled(env: Pick<CloudflareEnv, "SAAS_MODE" | "MAILFLARE_RUNTIME">): boolean {
	return isSaasMode(env);
}
