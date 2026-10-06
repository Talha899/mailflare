"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { PROVIDER_BASE_URLS } from "@/lib/agent/provider-constants";
import { saveAssistantAvailability } from "@/lib/agent/availability-client";
import { parseAgentModelIds, toggleAgentModelId } from "@/lib/agent/model-ids";
import type { AgentModelOption, AgentProviderPreset } from "@/lib/agent/provider-types";
import type { AgentAdminForm, AgentAdminMailbox } from "./types";
import { baseUrlForPreset, loadAgentAdminSettings, loadAgentModels, PROVIDER_PRESETS, saveAgentAdminSettings, saveAgentEnabled, saveAgentMailboxAllowlist, updateAgentModelRate } from "./utils";

const initialForm: AgentAdminForm = {
	provider: "compatible",
	preset: "openrouter",
	baseUrl: PROVIDER_BASE_URLS.openrouter,
	apiKey: "",
	model: "",
	rates: {},
};

function mailboxSelectionFromList(mailboxes: AgentAdminMailbox[]) {
	return new Set(mailboxes.filter((mailbox) => mailbox.enabled).map((mailbox) => mailbox.id));
}

export default function AdminAgentPage() {
	const [form, setForm] = useState<AgentAdminForm>(initialForm);
	const [assistantEnabled, setAssistantEnabled] = useState(true);
	const [configured, setConfigured] = useState(false);
	const [enabledSaving, setEnabledSaving] = useState(false);
	const [enabledStatus, setEnabledStatus] = useState<string | null>(null);
	const [loaded, setLoaded] = useState(false);
	const [hasSavedKey, setHasSavedKey] = useState(false);
	const [savedEndpoint, setSavedEndpoint] = useState("");
	const [models, setModels] = useState<AgentModelOption[]>([]);
	const [modelSource, setModelSource] = useState<"catalog" | "suggested" | null>(null);
	const [modelsLoading, setModelsLoading] = useState(false);
	const [modelError, setModelError] = useState<string | null>(null);
	const [status, setStatus] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [mailboxes, setMailboxes] = useState<AgentAdminMailbox[]>([]);
	const [selectedMailboxIds, setSelectedMailboxIds] = useState<Set<string>>(new Set());
	const [allowlistSaving, setAllowlistSaving] = useState(false);
	const [allowlistStatus, setAllowlistStatus] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		void loadAgentAdminSettings().then((data) => {
			if (!active) return;
			setForm({ provider: "compatible", preset: data.config.preset, baseUrl: data.config.baseUrl, apiKey: "", model: data.config.models.join(", "), rates: data.config.rates });
			setAssistantEnabled(data.assistantEnabled);
			setConfigured(data.configured);
			setHasSavedKey(data.config.hasApiKey);
			setSavedEndpoint(`${data.config.preset}|${data.config.baseUrl}`);
			setMailboxes(data.mailboxes);
			setSelectedMailboxIds(mailboxSelectionFromList(data.mailboxes));
			setLoaded(true);
		}).catch((error) => { if (active) setStatus(error instanceof Error ? error.message : "Could not load agent settings"); });
		return () => { active = false; };
	}, []);

	const canUseSavedKey = hasSavedKey && savedEndpoint === `${form.preset}|${form.baseUrl}`;
	const selectedModelIds = parseAgentModelIds(form.model);
	useEffect(() => {
		if (!loaded) return;
		setModels([]);
		setModelSource(null);
		setModelError(null);
		if (!form.baseUrl || (!form.apiKey.trim() && !canUseSavedKey)) {
			setModelError(form.preset === "custom" && !form.baseUrl ? "Enter an HTTPS base URL to load models." : "Enter an API key to load models.");
			return;
		}
		const controller = new AbortController();
		const timer = window.setTimeout(() => {
			setModelsLoading(true);
			void loadAgentModels(form, controller.signal).then((data) => {
				setModels(data.models);
				setModelSource(data.source);
			}).catch((error) => {
				if (!controller.signal.aborted) setModelError(error instanceof Error ? error.message : "Could not load models");
			}).finally(() => { if (!controller.signal.aborted) setModelsLoading(false); });
		}, 500);
		return () => { window.clearTimeout(timer); controller.abort(); };
	}, [loaded, form.preset, form.baseUrl, form.apiKey, canUseSavedKey]);

	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		setStatus(null);
		try {
			const data = await saveAgentAdminSettings({ ...form, provider: "compatible" });
			setForm((current) => ({ ...current, provider: "compatible", apiKey: "", model: data.config.models.join(", "), rates: data.config.rates }));
			setHasSavedKey(data.config.hasApiKey);
			setSavedEndpoint(`${data.config.preset}|${data.config.baseUrl}`);
			setConfigured(data.configured);
			if (data.mailboxes) {
				setMailboxes(data.mailboxes);
				setSelectedMailboxIds(mailboxSelectionFromList(data.mailboxes));
			}
			setStatus("Agent provider saved. Assistant settings can now choose from these models.");
			saveAssistantAvailability(data.assistantEnabled && data.configured);
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Could not save agent settings");
		} finally { setSaving(false); }
	}

	async function saveAllowlist() {
		setAllowlistSaving(true);
		setAllowlistStatus(null);
		try {
			const data = await saveAgentMailboxAllowlist([...selectedMailboxIds]);
			setConfigured(data.configured);
			setAssistantEnabled(data.assistantEnabled);
			setMailboxes(data.mailboxes);
			setSelectedMailboxIds(mailboxSelectionFromList(data.mailboxes));
			setAllowlistStatus("Mailbox allowlist saved.");
			// Invalidate per-mailbox caches; availability is mailbox-scoped after the allowlist.
			saveAssistantAvailability(data.assistantEnabled && data.configured);
		} catch (error) {
			setAllowlistStatus(error instanceof Error ? error.message : "Could not save mailbox allowlist");
		} finally { setAllowlistSaving(false); }
	}

	function toggleMailbox(id: string, checked: boolean) {
		setSelectedMailboxIds((current) => {
			const next = new Set(current);
			if (checked) next.add(id);
			else next.delete(id);
			return next;
		});
	}

	return <div className="space-y-6">
		<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
			<div className="min-w-0">
				<h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Agent</h1>
				<p className="mt-2 text-sm text-[var(--muted-foreground)]">
					Plug in your own OpenRouter, OpenAI, Groq, or custom OpenAI-compatible API key. Without a key, the assistant stays off.
				</p>
			</div>
			<Link href="/ai-usage" className="shrink-0 self-start rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]">View Usage</Link>
		</div>
		<Card className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-6">
			<CardContent className="flex flex-col gap-3 p-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
				<div>
					<p className="font-medium text-[var(--foreground)]">Enable assistant</p>
					<p className="mt-1 text-sm text-[var(--muted-foreground)]">
						Show assistant chat and allow automatic drafts for everyone. Organizations paste their own provider key below — AI is off until a provider, key, and model are saved.
					</p>
				</div>
				<Switch
					checked={assistantEnabled}
					disabled={!loaded || enabledSaving}
					onCheckedChange={(checked) => {
						setEnabledSaving(true);
						setEnabledStatus(null);
						void saveAgentEnabled(checked).then((data) => {
							setAssistantEnabled(data.assistantEnabled);
							if (typeof data.configured === "boolean") setConfigured(data.configured);
							const nextConfigured = typeof data.configured === "boolean" ? data.configured : configured;
							saveAssistantAvailability(data.available ?? (data.assistantEnabled && nextConfigured));
						}).catch((error) => setEnabledStatus(error instanceof Error ? error.message : "Could not update assistant availability")).finally(() => setEnabledSaving(false));
					}}
					aria-label="Enable assistant"
				/>
			</CardContent>
			{enabledStatus && <p role="status" className="mt-3 text-sm text-[var(--destructive)]">{enabledStatus}</p>}
			{loaded && assistantEnabled && !configured && (
				<p role="status" className="mt-3 text-sm text-[var(--muted-foreground)]">
					Assistant is enabled, but Sparkles stays hidden until a provider, API key, and model are saved below.
				</p>
			)}
		</Card>
		<Card className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
			<CardHeader className="py-0">
				<CardTitle>Mailboxes</CardTitle>
				<CardDescription>
					Choose which mailboxes may use the AI assistant. Unchecked mailboxes keep Sparkles hidden even when the assistant is enabled globally.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4 pt-6">
				{!loaded && <p className="text-sm text-[var(--muted-foreground)]">Loading mailboxes…</p>}
				{loaded && !mailboxes.length && (
					<p className="text-sm text-[var(--muted-foreground)]">No mailboxes yet. Create a mailbox first, then return here to allow AI.</p>
				)}
				{loaded && mailboxes.length > 0 && (
					<>
						<div className="flex flex-wrap gap-2">
							<Button
								type="button"
								variant="outline"
								className="active:scale-[0.98]"
								disabled={allowlistSaving}
								onClick={() => setSelectedMailboxIds(new Set(mailboxes.map((mailbox) => mailbox.id)))}
							>
								Select all
							</Button>
							<Button
								type="button"
								variant="outline"
								className="active:scale-[0.98]"
								disabled={allowlistSaving}
								onClick={() => setSelectedMailboxIds(new Set())}
							>
								Clear
							</Button>
						</div>
						<div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-[var(--border)] p-3">
							{mailboxes.map((mailbox) => (
								<label key={mailbox.id} className="flex items-start gap-3 text-sm">
									<Checkbox
										checked={selectedMailboxIds.has(mailbox.id)}
										disabled={allowlistSaving}
										onChange={(event) => toggleMailbox(mailbox.id, event.target.checked)}
										aria-label={`Allow AI for ${mailbox.address}`}
									/>
									<span className="min-w-0">
										<span className="block font-medium text-[var(--foreground)]">{mailbox.address}</span>
										{mailbox.displayName ? (
											<span className="block text-[var(--muted-foreground)]">{mailbox.displayName}</span>
										) : null}
									</span>
								</label>
							))}
						</div>
					</>
				)}
				{allowlistStatus && (
					<p role="status" className={`text-sm ${allowlistStatus.includes("saved") ? "text-[var(--foreground)]" : "text-[var(--destructive)]"}`}>
						{allowlistStatus}
					</p>
				)}
				<Button
					type="button"
					className="active:scale-[0.98]"
					disabled={!loaded || allowlistSaving || !mailboxes.length}
					onClick={() => void saveAllowlist()}
				>
					{allowlistSaving ? "Saving…" : "Save allowlist"}
				</Button>
			</CardContent>
		</Card>
		<Card className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
			<CardHeader className="py-0">
				<CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" />AI provider</CardTitle>
				<CardDescription>
					Paste your organization&apos;s OpenRouter, OpenAI, Groq, or custom API key. Email content is sent to the selected provider when someone uses the assistant. Sending a draft still requires human approval.
				</CardDescription>
			</CardHeader>
			<CardContent className="pt-6"><form onSubmit={submit} className="space-y-5">
				<div className="space-y-2">
					<Label htmlFor="agent-preset">Provider</Label>
					<Select
						id="agent-preset"
						value={form.preset}
						disabled={!loaded}
						onChange={(event) => {
							const preset = event.target.value as AgentProviderPreset;
							setForm((current) => ({ ...current, provider: "compatible", preset, baseUrl: baseUrlForPreset(preset), apiKey: "", model: "" }));
						}}
					>
						{PROVIDER_PRESETS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
					</Select>
				</div>
				<div className="space-y-2">
					<Label htmlFor="agent-url">API base URL</Label>
					<Input
						id="agent-url"
						type="url"
						value={form.baseUrl}
						readOnly={form.preset !== "custom"}
						placeholder="https://provider.example/v1"
						onChange={(event) => setForm((current) => ({ ...current, baseUrl: event.target.value, model: "" }))}
						required
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="agent-key">API key</Label>
					<Input
						id="agent-key"
						type="password"
						value={form.apiKey}
						autoComplete="new-password"
						placeholder={canUseSavedKey ? "Saved key (leave blank to keep)" : "Enter API key"}
						onChange={(event) => setForm((current) => ({ ...current, apiKey: event.target.value }))}
					/>
					<p className="text-xs text-[var(--muted-foreground)]">
						{canUseSavedKey
							? "An API key is saved on the server. Enter a new one to replace it."
							: "Paste your own provider key. It is stored on the server and never shown again. Without a key, AI stays off."}
					</p>
				</div>
				<div className="space-y-2">
					<p className="text-sm font-medium">Models</p>
					<div className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-input p-3">
						{modelsLoading && <p className="text-sm text-[var(--muted-foreground)]">Loading models…</p>}
						{!modelsLoading && !models.length && <p className="text-sm text-[var(--muted-foreground)]">Models unavailable</p>}
						{models.map((item) => (
							<label key={item.id} className="flex items-start gap-2 text-sm">
								<Checkbox
									checked={selectedModelIds.includes(item.id)}
									onChange={(event) => setForm((current) => ({ ...current, model: toggleAgentModelId(current.model, item.id, event.target.checked) }))}
								/>
								<span>{item.name === item.id ? item.id : `${item.name} · ${item.id}`}</span>
							</label>
						))}
					</div>
					{modelSource === "suggested" && (
						<p className="text-xs text-[var(--muted-foreground)]">Showing suggested models because a full catalog is unavailable.</p>
					)}
					{modelError && <p className="text-xs text-[var(--destructive)]">{modelError}</p>}
					<Label htmlFor="agent-model-id" className="block pt-2 text-xs text-[var(--muted-foreground)]">Or enter model IDs (comma-separated)</Label>
					<Input
						id="agent-model-id"
						value={form.model}
						onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))}
						placeholder="provider/model-id, provider/another-model"
						required
					/>
					<p className="text-xs text-[var(--muted-foreground)]">Choose models that support tool calling so the assistant can read mail and create drafts. The first model is the default.</p>
				</div>
				<div className="space-y-3">
					<p className="text-sm font-medium">Estimated cost rates</p>
					<p className="text-xs text-[var(--muted-foreground)]">Optional USD per 1 million tokens. Usage without both rates shows spending as unavailable.</p>
					{selectedModelIds.map((model) => (
						<div key={model} className="grid gap-2 rounded-xl border border-[var(--border)] p-3 sm:grid-cols-[minmax(0,1fr)_6rem_6rem]">
							<span className="min-w-0 break-all text-sm">{model}</span>
							<label className="text-xs text-[var(--muted-foreground)]">
								Input <Input type="number" min="0" step="any" value={form.rates[model]?.input ?? ""} onChange={(event) => setForm((current) => updateAgentModelRate(current, model, "input", event.target.value))} placeholder="USD / 1M" />
							</label>
							<label className="text-xs text-[var(--muted-foreground)]">
								Output <Input type="number" min="0" step="any" value={form.rates[model]?.output ?? ""} onChange={(event) => setForm((current) => updateAgentModelRate(current, model, "output", event.target.value))} placeholder="USD / 1M" />
							</label>
						</div>
					))}
				</div>
				{status && <p role="status" className="text-sm text-[var(--foreground)]">{status}</p>}
				<Button
					type="submit"
					className="active:scale-[0.98]"
					disabled={!loaded || saving || !selectedModelIds.length || !form.baseUrl || (!form.apiKey.trim() && !canUseSavedKey)}
				>
					{saving ? "Saving…" : "Save agent settings"}
				</Button>
			</form></CardContent>
		</Card>
	</div>;
}
