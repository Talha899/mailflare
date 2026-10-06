"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Inbox, LogOut, Settings, UsersRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import { ProgressiveAvatarImage } from "@/components/progressive-avatar-image";
import { isIdentityMailbox } from "@/components/mailbox-provider-utils";
import { useMessageCounts } from "@/hooks/use-message-counts";
import { authFetch } from "@/lib/auth/client";
import { getAvatarColorStyle } from "@/lib/avatar-colors";
import { logoutClientSession } from "@/lib/auth/logout";
import {
	PROFILE_AVATAR_CHANGED_EVENT,
	getProfileAvatarUrl,
} from "@/lib/profile/avatar-client";
import { PROFILE_NAME_CHANGED_EVENT } from "@/lib/profile/name-client";
import type { ProfileAvatarChangedDetail, ProfileNameChangedDetail } from "@/lib/profile/types";
import { MAILBOX_AVATAR_CHANGED_EVENT } from "@/lib/mailboxes/avatar-client";
import type { MailboxAvatarChangedDetail } from "@/lib/mailboxes/avatar-client-types";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import { AppPreferences } from "@/components/app-preferences";
import type {
	AccountAvatarProps,
	MailboxAccountRowProps,
	MailboxSelectorUser,
	MailboxSelectorProps,
} from "./mailbox-selector-types";
import {
	getAccountInitial,
	getMailboxAddress,
	getMailboxName,
} from "./mailbox-selector-utils";

function AccountAvatar({
	name,
	colorSeed = name,
	hasAvatar = false,
	avatarUrl = "/api/profile/avatar",
	size = "small",
	onAvatarError,
}: AccountAvatarProps) {
	const sizeClass = size === "large" ? "h-14 w-14 text-lg" : "h-9 w-9 text-sm";
	const [imageFailed, setImageFailed] = useState(false);

	useEffect(() => {
		setImageFailed(false);
	}, [avatarUrl, hasAvatar]);

	if (hasAvatar && !imageFailed) {
		return (
			<ProgressiveAvatarImage
				src={avatarUrl}
				alt={`${name} profile picture`}
				className={`${sizeClass} shrink-0 rounded-lg border border-[var(--border)] object-cover`}
				onError={() => {
					setImageFailed(true);
					onAvatarError?.();
				}}
			/>
		);
	}

	return (
		<div
			className={`${sizeClass} flex shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] font-semibold text-[var(--primary-foreground)]`}
			style={getAvatarColorStyle(colorSeed)}
			aria-hidden="true"
		>
			{getAccountInitial(name)}
		</div>
	);
}

function MailboxAccountRow({ mailbox, unread, avatarUrl, onSelect }: MailboxAccountRowProps) {
	const name = getMailboxName(mailbox);

	return (
		<button
			type="button"
			onClick={onSelect}
			className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[var(--muted)] active:scale-[0.99]"
		>
			<AccountAvatar
				name={name}
				colorSeed={getMailboxAddress(mailbox)}
				hasAvatar={!!mailbox.hasAvatar || !!avatarUrl}
				avatarUrl={avatarUrl ?? `/api/mailboxes/${mailbox.id}/avatar`}
			/>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5">
					<p className="truncate text-sm font-medium text-[var(--foreground)]">{name}</p>
					{mailbox.type === "shared" && (
						<Tooltip label="Shared inbox">
							<span title="Shared inbox" aria-label="Shared inbox" className="shrink-0 text-[var(--primary)]">
								<UsersRound className="h-3.5 w-3.5" />
							</span>
						</Tooltip>
					)}
				</div>
				<p className="truncate text-xs text-[var(--muted-foreground)]">{getMailboxAddress(mailbox)}</p>
			</div>
			{unread > 0 && (
				<span className="rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--primary)]">
					{unread > 99 ? "99+" : unread}
				</span>
			)}
		</button>
	);
}

export function MailboxSelector({ initialUser }: MailboxSelectorProps = {}) {
	const { selectedMailbox, setSelectedMailbox, mailboxes, isLoading } = useSelectedMailbox();
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [user, setUser] = useState<MailboxSelectorUser | null>(initialUser ?? null);
	const [hasAvatar, setHasAvatar] = useState(!!initialUser?.hasAvatar);
	const [avatarUrl, setAvatarUrl] = useState("/api/profile/avatar");
	const [mailboxAvatarUrls, setMailboxAvatarUrls] = useState<Record<string, string>>({});
	const ref = useRef<HTMLDivElement>(null);
	const { counts } = useMessageCounts(null, open);

	useEffect(() => {
		function onPointerDown(event: PointerEvent) {
			if (!ref.current?.contains(event.target as Node)) setOpen(false);
		}

		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, []);

	// Keyboard: Escape closes and returns focus to the avatar; focus starts inside the panel.
	useEffect(() => {
		if (!open) return;
		const panel = ref.current?.querySelector<HTMLElement>("[data-account-panel]");
		panel?.querySelector<HTMLElement>("a, button")?.focus();
		function onKeyDown(event: KeyboardEvent) {
			if (event.key !== "Escape") return;
			setOpen(false);
			ref.current?.querySelector<HTMLButtonElement>("[data-account-trigger]")?.focus();
		}
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [open]);

	useEffect(() => {
		authFetch("/api/auth/me", { redirectOnUnauthorized: false })
			.then((response) => (response.ok ? response.json() : null))
			.then((data) => {
				const authData = data as { user?: MailboxSelectorUser } | null;
				setUser(authData?.user ?? null);
				setHasAvatar(!!authData?.user?.hasAvatar);
			})
			.catch(() => setUser(null));
	}, []);

	useEffect(() => {
		function onAvatarChanged(event: Event) {
			const detail = (event as CustomEvent<ProfileAvatarChangedDetail>).detail;
			setAvatarUrl(detail?.url ?? getProfileAvatarUrl());
			setHasAvatar(true);
			setMailboxAvatarUrls((current) => {
				const next = { ...current };
				const version = Date.now();
				for (const mailbox of mailboxes) {
					if (isIdentityMailbox(mailbox)) {
						next[mailbox.id] = `/api/mailboxes/${mailbox.id}/avatar?v=${version}`;
					}
				}
				return next;
			});
		}

		window.addEventListener(PROFILE_AVATAR_CHANGED_EVENT, onAvatarChanged);
		return () => window.removeEventListener(PROFILE_AVATAR_CHANGED_EVENT, onAvatarChanged);
	}, [mailboxes]);

	useEffect(() => {
		function onNameChanged(event: Event) {
			const { name } = (event as CustomEvent<ProfileNameChangedDetail>).detail;
			setUser((current) => current ? { ...current, name } : current);
		}

		window.addEventListener(PROFILE_NAME_CHANGED_EVENT, onNameChanged);
		return () => window.removeEventListener(PROFILE_NAME_CHANGED_EVENT, onNameChanged);
	}, []);

	useEffect(() => {
		function onMailboxAvatarChanged(event: Event) {
			const detail = (event as CustomEvent<MailboxAvatarChangedDetail>).detail;
			if (!detail?.mailboxId || !detail.url) return;
			setMailboxAvatarUrls((current) => ({
				...current,
				[detail.mailboxId]: detail.url,
			}));
		}

		window.addEventListener(MAILBOX_AVATAR_CHANGED_EVENT, onMailboxAvatarChanged);
		return () => window.removeEventListener(MAILBOX_AVATAR_CHANGED_EVENT, onMailboxAvatarChanged);
	}, []);

	if (isLoading && !initialUser) {
		return <Skeleton className="h-9 w-9 rounded-lg" />;
	}

	const selectedName = selectedMailbox ? getMailboxName(selectedMailbox) : user?.name ?? "Account";
	const selectedEmail = selectedMailbox ? getMailboxAddress(selectedMailbox) : user?.email ?? "";
	const selectedMailboxAvatarUrl = selectedMailbox
		? mailboxAvatarUrls[selectedMailbox.id]
		: undefined;
	const selectedHasAvatar = selectedMailbox
		? !!selectedMailbox.hasAvatar || !!selectedMailboxAvatarUrl
		: hasAvatar;
	const selectedAvatarUrl = selectedMailbox
		? selectedMailboxAvatarUrl ?? `/api/mailboxes/${selectedMailbox.id}/avatar`
		: avatarUrl;
	const otherMailboxes = mailboxes.filter((mailbox) => mailbox.id !== selectedMailbox?.id);
	async function logout() {
		await logoutClientSession();
		setOpen(false);
		router.replace("/login");
		router.refresh();
	}

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				onClick={() => setOpen((value) => !value)}
				className="rounded-full p-0.5 transition-colors hover:bg-[var(--hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
				aria-label="Open account menu"
				aria-expanded={open}
				aria-haspopup="dialog"
				data-account-trigger
			>
				<AccountAvatar
					name={selectedName}
					colorSeed={selectedEmail || selectedName}
					hasAvatar={selectedHasAvatar}
					avatarUrl={selectedAvatarUrl}
					onAvatarError={() => {
						if (!selectedMailbox) setHasAvatar(false);
					}}
				/>
			</button>

			{open && (
				<div
					data-account-panel
					role="dialog"
					aria-label="Account"
					data-state="open"
					className="popover-content absolute right-0 top-12 z-90 flex max-h-[82vh] w-[min(340px,calc(100vw-16px))] flex-col overflow-hidden overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] shadow-[var(--shadow-lg)]"
				>
					{/* Identity */}
					<div className="border-b border-[var(--border)] px-4 pb-3 pt-4">
						<div className="flex items-start gap-3">
							<AccountAvatar
								name={selectedName}
								colorSeed={selectedEmail || selectedName}
								hasAvatar={selectedHasAvatar}
								avatarUrl={selectedAvatarUrl}
								size="large"
								onAvatarError={() => {
									if (!selectedMailbox) setHasAvatar(false);
								}}
							/>
							<div className="min-w-0 flex-1 pt-0.5">
								<div className="flex items-center gap-2">
									<p className="truncate text-[15px] font-semibold tracking-tight text-[var(--foreground)]">
										{selectedName}
									</p>
									{selectedMailbox?.type === "shared" && (
										<Tooltip label="Shared inbox">
											<span title="Shared inbox" aria-label="Shared inbox" className="shrink-0 text-[var(--primary)]">
												<UsersRound className="h-3.5 w-3.5" />
											</span>
										</Tooltip>
									)}
									<Check className="ml-auto h-4 w-4 shrink-0 text-[var(--primary)]" aria-hidden />
								</div>
								<p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">
									{selectedEmail}
								</p>
							</div>
						</div>
					</div>

					{/* Quick links — webmail only, no admin */}
					<div className="space-y-0.5 border-b border-[var(--border)] px-2 py-2">
						<Link
							href="/inbox"
							onClick={() => setOpen(false)}
							className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)] active:scale-[0.99]"
						>
							<Inbox size={16} className="text-[var(--muted-foreground)]" />
							Inbox
						</Link>
						<Link
							href="/calendar"
							onClick={() => setOpen(false)}
							className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)] active:scale-[0.99]"
						>
							<CalendarDays size={16} className="text-[var(--muted-foreground)]" />
							Calendar
						</Link>
						<Link
							href="/settings/account"
							onClick={() => setOpen(false)}
							className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)] active:scale-[0.99]"
						>
							<Settings size={16} className="text-[var(--muted-foreground)]" />
							Settings
						</Link>
					</div>

					{otherMailboxes.length > 0 && (
						<div className="max-h-48 overflow-y-auto border-b border-[var(--border)] px-2 py-2">
							<p className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
								Other mailboxes
							</p>
							{otherMailboxes.map((mailbox) => {
								const mailboxCount = counts.mailboxes.find((count) => count.mailboxId === mailbox.id);
								return (
									<MailboxAccountRow
										key={mailbox.id}
										mailbox={mailbox}
										unread={mailboxCount?.unread ?? 0}
										avatarUrl={mailboxAvatarUrls[mailbox.id]}
										onSelect={() => {
											setSelectedMailbox(mailbox);
											setOpen(false);
											router.push("/inbox");
										}}
									/>
								);
							})}
						</div>
					)}

					{/* Preferences — theme / shortcuts / credit */}
					<div className="border-b border-[var(--border)] px-3 py-3">
						<AppPreferences onOpenShortcuts={() => setOpen(false)} />
					</div>

					<div className="p-2">
						<button
							type="button"
							onClick={logout}
							className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] active:scale-[0.99]"
						>
							<LogOut size={16} />
							Sign out
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
