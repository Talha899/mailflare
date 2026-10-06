import type { AgentProviderPreset } from "./provider-types";
import { getAgentProviderConfig, resolveAgentBaseUrl } from "./provider";

export async function listCompatibleAgentModels(env: CloudflareEnv, input: { preset: AgentProviderPreset; baseUrl: string; apiKey?: string }) {
	const baseUrl = resolveAgentBaseUrl(input.preset, input.baseUrl);
	const saved = await getAgentProviderConfig(env);
	const key = input.apiKey?.trim() || (saved.provider === "compatible" && saved.preset === input.preset && saved.baseUrl === baseUrl ? saved.apiKey : "");
	if (!key) throw new Error("Enter an API key to load models");
	const response = await fetch(`${baseUrl}/models`, { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" }, signal: AbortSignal.timeout(10_000), redirect: "error" });
	if (!response.ok) throw new Error(`Model list request failed (${response.status})`);
	const json = await response.json() as { data?: { id?: unknown; name?: unknown }[] };
	const models = (json.data ?? []).filter((item) => typeof item.id === "string" && item.id.length <= 200).map((item) => ({ id: item.id as string, name: typeof item.name === "string" ? item.name : item.id as string })).slice(0, 2_000).sort((a, b) => a.name.localeCompare(b.name));
	if (!models.length) throw new Error("Provider returned no models");
	return { models, source: "catalog" as const };
}
