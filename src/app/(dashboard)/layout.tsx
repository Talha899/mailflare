"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { ComposeProvider } from "@/components/compose/compose-context";
import { FloatingComposer } from "@/components/compose/floating-composer";
import { MailSearchInput } from "@/components/mail-search/mail-search-input";
import { MailSearchProvider } from "@/components/mail-search/mail-search-context";
import { MailboxProvider, useSelectedMailbox } from "@/components/mailbox-provider";
import { MailboxSelector } from "@/components/mailbox-selector";
import { AgentPanel } from "@/components/agent/agent-panel";
import { AssistantOpenContext } from "@/components/agent/assistant-open-state";
import { Button } from "@/components/ui/button";
import { LicenseIndicator } from "@/components/license-indicator";
import { DashboardNav } from "@/components/dashboard-nav";
import { SidebarProvider } from "@/components/sidebar-state";
import { SidebarResizeBoundary } from "@/components/sidebar-resize-boundary";
import { ShortcutsProvider } from "@/components/shortcuts";
import { authFetch } from "@/lib/auth/client";
import clsx from "clsx";
import { useDashboardState } from "./dashboard-state";
import { useAssistantAvailability } from "./use-assistant-availability";

function DashboardShell({ children }: { children: React.ReactNode }) {
	const { selectedMailbox } = useSelectedMailbox();
	const { assistantOpen, setAssistantOpen, assistantFullSize, setAssistantFullSize } = useDashboardState();
	const assistantEnabled = useAssistantAvailability(selectedMailbox?.id ?? null);
	const assistantVisible = assistantEnabled === true && assistantOpen;
	const [jobsActive, setJobsActive] = useState(false);

	useEffect(() => {
		if (assistantEnabled === false && (assistantOpen || assistantFullSize)) {
			setAssistantOpen(false);
			setAssistantFullSize(false);
		}
	}, [assistantEnabled, assistantOpen, assistantFullSize, setAssistantOpen, setAssistantFullSize]);

	useEffect(() => {
		const mailboxId = selectedMailbox?.id;
		if (!assistantEnabled || !mailboxId) {
			setJobsActive(false);
			return;
		}
		let active = true;
		const poll = async () => {
			try {
				const response = await authFetch(`/api/agent/jobs?mailboxId=${encodeURIComponent(mailboxId)}`, {
					redirectOnUnauthorized: false,
				});
				if (!response.ok || !active) return;
				const data = await response.json() as { jobs?: { status: string }[] };
				const busy = (data.jobs ?? []).some((job) => job.status === "pending" || job.status === "running");
				if (active) setJobsActive(busy);
			} catch {
				/* Jobs indicator is optional polish. */
			}
		};
		void poll();
		const timer = window.setInterval(() => void poll(), 15_000);
		return () => {
			active = false;
			window.clearInterval(timer);
		};
	}, [assistantEnabled, selectedMailbox?.id]);

	return (
		<div className="grid h-dvh grid-cols-[72px_minmax(0,1fr)] overflow-hidden bg-[var(--background)] transition-[grid-template-columns] md:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]" style={{ transitionDuration: "var(--sidebar-transition-duration)" }}>
			<aside className="relative z-30 w-[var(--sidebar-width)] min-h-0 min-w-0 bg-[var(--sidebar)]">
				<div className="h-full overflow-y-auto overscroll-contain px-3 py-4 scrollbar-gutter-stable">
					<DashboardNav />
				</div>
				<SidebarResizeBoundary />
			</aside>
			<div className="flex min-h-0 min-w-0 flex-col">
				<header className="flex h-12 w-full shrink-0 items-center gap-2.5 border-b border-[var(--border)] bg-[var(--sidebar)] px-3 text-sm md:px-4">
					<MailSearchInput />
					<LicenseIndicator />
					{assistantEnabled && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className={
								assistantOpen
									? "h-9 w-9 shrink-0 rounded-lg bg-[var(--muted)] px-0 text-[var(--foreground)]"
									: "h-9 w-9 shrink-0 rounded-lg px-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
							}
							onClick={() => {
								setAssistantOpen((current) => !current);
								setAssistantFullSize(false);
							}}
							aria-label={assistantOpen ? "Close email assistant" : "Open email assistant"}
							aria-expanded={assistantOpen}
							aria-controls="email-assistant-panel"
						>
							<Sparkles className={clsx("h-4 w-4", jobsActive && "animate-pulse")} strokeWidth={1.75} />
						</Button>
					)}
					<MailboxSelector />
				</header>
				<div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
					<AssistantOpenContext.Provider value={assistantVisible}>
						<main className="min-h-0 min-w-0 flex-1 overflow-y-auto rounded-tl-xl bg-[var(--card)] overscroll-contain scrollbar-gutter-stable" aria-hidden={assistantVisible && assistantFullSize} inert={assistantVisible && assistantFullSize}>
							{children}
						</main>
					</AssistantOpenContext.Provider>
					<aside className={clsx(assistantFullSize ? "pl-0" : "pl-4", `min-h-0 min-w-0 shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out motion-reduce:transition-none pr-2 pb-2`, assistantVisible ? "" : "opacity-0")} style={{ width: assistantVisible ? assistantFullSize ? "100%" : "min(390px, 100%)" : "0px" }} aria-hidden={!assistantVisible} inert={!assistantVisible}>
						{assistantEnabled && <AgentPanel open={assistantVisible} fullSize={assistantFullSize} onToggleFullSize={() => setAssistantFullSize((current) => !current)} onClose={() => { setAssistantOpen(false); setAssistantFullSize(false); }} />}
					</aside>
				</div>
			</div>
			<FloatingComposer />
		</div>
	);
}

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<AuthGuard>
			<SidebarProvider>
				<MailboxProvider>
					<ComposeProvider>
						<MailSearchProvider>
							<ShortcutsProvider>
								<DashboardShell>{children}</DashboardShell>
							</ShortcutsProvider>
						</MailSearchProvider>
					</ComposeProvider>
				</MailboxProvider>
			</SidebarProvider>
		</AuthGuard>
	);
}
