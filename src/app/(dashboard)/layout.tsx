"use client";

import { useEffect, useState } from "react";
import { Menu, PenSquare, Sparkles } from "lucide-react";
import { useCompose } from "@/components/compose/compose-context";
import { useIsMobile } from "@/components/sidebar-mobile-utils";
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
import { SidebarProvider, useSidebar } from "@/components/sidebar-state";
import { SidebarResizeBoundary } from "@/components/sidebar-resize-boundary";
import { ShortcutsProvider } from "@/components/shortcuts";
import { authFetch } from "@/lib/auth/client";
import clsx from "clsx";
import { useDashboardState } from "./dashboard-state";
import { useAssistantAvailability } from "./use-assistant-availability";

function DashboardShell({ children }: { children: React.ReactNode }) {
	const { selectedMailbox } = useSelectedMailbox();
	const { minimal, toggle } = useSidebar();
	const { openComposer } = useCompose();
	const mobile = useIsMobile();

	useEffect(() => {
		if (!mobile || minimal) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") toggle();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [mobile, minimal, toggle]);
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
		<div className="grid h-dvh grid-cols-[minmax(0,1fr)] overflow-hidden bg-[var(--sidebar)] transition-[grid-template-columns] md:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]" style={{ transitionDuration: "var(--sidebar-transition-duration)" }}>
			{mobile && !minimal && (
				<button
					type="button"
					aria-label="Close menu"
					onClick={toggle}
					className="fade-in fixed inset-0 z-40 bg-[var(--overlay)] md:hidden"
				/>
			)}
			<aside
				id="mail-sidebar"
				aria-label="Mail folders"
				className={clsx(
					"z-50 min-h-0 min-w-0 bg-[var(--sidebar)]",
					// Phones: an off-canvas drawer. Larger screens: the resizable column.
					"fixed inset-y-0 left-0 w-[min(288px,calc(100vw-48px))] shadow-[var(--shadow-lg)] md:relative md:inset-auto md:z-30 md:w-[var(--sidebar-width)] md:shadow-none",
					mobile && minimal ? "hidden" : mobile ? "drawer-in block" : "block",
				)}
			>
				<div className="h-full overflow-y-auto overscroll-contain px-3 py-4 scrollbar-gutter-stable">
					<DashboardNav />
				</div>
				<SidebarResizeBoundary />
			</aside>
			<div className="flex min-h-0 min-w-0 flex-col">
				<header className="flex h-14 w-full shrink-0 items-center gap-2 bg-[var(--sidebar)] px-2 text-sm sm:gap-2.5 md:px-4">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="md:hidden"
						onClick={toggle}
						aria-label="Open menu"
						aria-controls="mail-sidebar"
						aria-expanded={mobile && !minimal}
					>
						<Menu className="h-5 w-5" />
					</Button>
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
				<div className="flex min-h-0 min-w-0 flex-1 overflow-hidden md:pb-2 md:pr-2">
					<AssistantOpenContext.Provider value={assistantVisible}>
						<main className="min-h-0 min-w-0 flex-1 overflow-y-auto border-t border-[var(--border)] bg-[var(--card)] overscroll-contain scrollbar-gutter-stable md:rounded-2xl md:border md:shadow-[var(--shadow-sm)]" aria-hidden={assistantVisible && assistantFullSize} inert={assistantVisible && assistantFullSize}>
							{children}
						</main>
					</AssistantOpenContext.Provider>
					<aside className={clsx("min-h-0 min-w-0 shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out motion-reduce:transition-none", assistantVisible ? (assistantFullSize ? "pl-0" : "pl-2 md:pl-3") : "p-0 opacity-0")} style={{ width: assistantVisible ? assistantFullSize ? "100%" : "min(390px, 100%)" : "0px" }} aria-hidden={!assistantVisible} inert={!assistantVisible}>
						{assistantEnabled && <AgentPanel open={assistantVisible} fullSize={assistantFullSize} onToggleFullSize={() => setAssistantFullSize((current) => !current)} onClose={() => { setAssistantOpen(false); setAssistantFullSize(false); }} />}
					</aside>
				</div>
			</div>
			<FloatingComposer />
			{mobile && (
				<button
					type="button"
					onClick={openComposer}
					aria-label="Compose"
					className="fixed bottom-5 right-5 z-30 flex h-14 items-center gap-2 rounded-2xl bg-[var(--compose)] px-5 text-sm font-semibold text-[var(--compose-foreground)] shadow-[var(--shadow-lg)] transition-transform active:scale-95 md:hidden"
				>
					<PenSquare className="h-5 w-5" />
					Compose
				</button>
			)}
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
