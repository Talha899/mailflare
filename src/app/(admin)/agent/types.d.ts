import type { AgentModelOption, AgentModelRates, AgentProviderKind, AgentProviderPreset, AgentProviderPublicConfig } from "@/lib/agent/provider-types";

type AgentAdminConfig = AgentProviderPublicConfig;
export type AgentAdminMailbox = { id: string; address: string; displayName: string | null; enabled: boolean };
export type AgentAdminSettingsResponse = {
	config: AgentAdminConfig;
	assistantEnabled: boolean;
	configured: boolean;
	mailboxes: AgentAdminMailbox[];
	error?: string;
};
export type AgentEnabledResponse = {
	assistantEnabled: boolean;
	configured?: boolean;
	available?: boolean;
	error?: string;
};
export type AgentAdminModelsResponse = { models: AgentModelOption[]; source: "catalog" | "suggested"; error?: string };
export type AgentAdminForm = { provider: AgentProviderKind; preset: AgentProviderPreset; baseUrl: string; apiKey: string; model: string; rates: Record<string, AgentModelRates> };
