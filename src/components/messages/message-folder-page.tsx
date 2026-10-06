"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { ChevronLeft, ChevronRight, ListFilter, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/feedback";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@/components/ui/tooltip";
import { useMailSearch } from "@/components/mail-search/mail-search-context";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import { usePageLoading } from "@/components/page-loading";
import { useIsMobile } from "@/components/sidebar-mobile-utils";
import { useMessageCounts } from "@/hooks/use-message-counts";
import { useMessages } from "@/hooks/use-messages";
import type { BulkMessageAction } from "@/app/api/messages/bulk/types";
import type { Message } from "@/hooks/types";
import { setMessageDragData } from "@/lib/messages/drag-utils";
import { BulkMessageToolbar } from "./bulk-message-toolbar";
import { MessageListRowActions } from "./message-list-row-actions";
import { dispatchMessageCountsDelta, toggleMessageStar } from "./message-list-row-actions-utils";
import { MessageNavigationProgress, useMessageNavigation } from "./message-navigation";
import { rememberOpenedUnreadMessage } from "./message-detail-navigation-utils";
import { MessageRowSelect } from "./message-row-select";
import { getMessageEmptyState } from "./message-empty-state-utils";
import { useConversationView } from "./use-conversation-view";
import type { MessageFolderPageProps, MessageListRowProps } from "./types";
import {
	formatMessageListTimestamp,
	getPageRange,
	getMessageAvatarIdentity,
	getMessageParty,
	getMessagePartyClassName,
	getMessagePreview,
	isMessageListRowUnread,
	formatEmailPageTitle,
	getMailboxAddress,
	runBulkMessageAction,
} from "./utils";
import clsx from "clsx";

const pageSize = 25;

function MessageListRow({
	message,
	config,
	selected,
	selectionActive,
	active = false,
	compact = false,
	currentAccountName,
	onSelectedChange,
	onMessageAction,
	dragMessageIds,
}: MessageListRowProps & { selectionActive: boolean }) {
	const [read, setRead] = useState(message.read);
	const [threadUnread, setThreadUnread] = useState(message.threadUnread);
	const [starred, setStarred] = useState(message.starred);
	useEffect(() => setRead(message.read), [message.read]);
	useEffect(() => setThreadUnread(message.threadUnread), [message.threadUnread]);
	useEffect(() => setStarred(message.starred), [message.starred]);
	const rowMessage = { ...message, read, starred, threadUnread };
	const unread = isMessageListRowUnread(rowMessage);
	const draggable = config.folder === "inbox" && message.direction === "inbound";
	const party = getMessageParty(rowMessage, config.folder, currentAccountName);
	const avatar = getMessageAvatarIdentity(rowMessage, config.folder);
	const preview = getMessagePreview(rowMessage, config.folder);
	const href = `${config.hrefPrefix}/${message.id}`;
	const navigation = useMessageNavigation(href, rowMessage);
	const canStar = config.folder === "inbox" && message.direction === "inbound";
	const hasRowActions = (config.folder === "inbox" || config.folder === "snoozed") && message.direction === "inbound";
	const threadCount = message.threadCount ?? 1;

	function onMessageNavigate(event: MouseEvent<HTMLAnchorElement>) {
		if (!read && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
			rememberOpenedUnreadMessage(message.id);
			const previousThreadUnread = threadUnread;
			setRead(true);
			if (previousThreadUnread !== undefined) setThreadUnread(Math.max(0, previousThreadUnread - 1));
			if (message.direction === "inbound") dispatchMessageCountsDelta({ inboxUnreadDelta: -1 });
			void runBulkMessageAction([message.id], "read", false).catch(() => {
				setRead(false);
				setThreadUnread(previousThreadUnread);
				if (message.direction === "inbound") dispatchMessageCountsDelta({ inboxUnreadDelta: 1 });
			});
		}
		if (config.folder !== "drafts") navigation.onNavigate(event, !read);
	}

	const rowStateClassName = clsx(
		active && "bg-[var(--accent)] before:bg-[var(--primary)]",
		!active && selected && "bg-[color-mix(in_oklab,var(--accent)_70%,var(--card))]",
		!active && !selected && unread && "bg-[var(--card)] hover:bg-[var(--hover)]",
		!active && !selected && !unread && "bg-[color-mix(in_oklab,var(--surface-sunken)_45%,var(--card))] hover:bg-[var(--hover)]",
	);

	const selectControl = (
		<MessageRowSelect
			selected={selected}
			selectionActive={selectionActive}
			onSelectedChange={(next) => onSelectedChange(message.id, next)}
			label={`Select message from ${party}`}
			mailboxId={message.mailboxId}
			address={avatar.address}
			name={avatar.name}
			hasManagedAvatar={message.direction === "inbound" && !!message.fromContactHasAvatar}
			size={compact ? "sm" : "md"}
		/>
	);

	const starButton = canStar ? (
		<Tooltip label={starred ? "Unstar" : "Star"}>
			<button
				type="button"
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					void toggleMessageStar(message.id).then((result) => setStarred(result.starred));
				}}
				aria-label={starred ? "Unstar" : "Star"}
				aria-pressed={starred}
				className="relative z-10 inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--subtle-foreground)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
			>
				<Star className={clsx("h-4 w-4", starred && "fill-[var(--star)] text-[var(--star)]")} />
			</button>
		</Tooltip>
	) : null;

	const meta = (
		<span className="flex shrink-0 items-center gap-1.5">
			<time
				dateTime={message.createdAt}
				className={clsx(
					"whitespace-nowrap text-xs tabular-nums",
					unread ? "font-semibold text-[var(--foreground)]" : "text-[var(--muted-foreground)]",
					hasRowActions && !compact && "group-hover:invisible group-focus-within:invisible",
				)}
			>
				{formatMessageListTimestamp(message.createdAt)}
			</time>
		</span>
	);

	const dragProps = {
		draggable,
		onDragStart: (event: React.DragEvent) => {
			if (!draggable) return;
			setMessageDragData(event.dataTransfer, { messageIds: dragMessageIds });
		},
	};

	if (compact) {
		return (
			<div
				className={clsx(
					"group relative flex gap-3 px-4 py-3 transition-colors",
					"before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-transparent",
					rowStateClassName,
					draggable && "cursor-grab active:cursor-grabbing",
				)}
				{...dragProps}
			>
				<MessageNavigationProgress progress={navigation.progress} />
				<div className="pt-0.5">{selectControl}</div>
				<Link href={href} onClick={onMessageNavigate} className="min-w-0 flex-1 after:absolute after:inset-0 after:content-['']" aria-label={`${party}: ${rowMessage.subject ?? "(no subject)"}`}>
					<span className="flex items-baseline justify-between gap-3">
						<span className={clsx("flex min-w-0 items-center gap-1.5 text-sm", getMessagePartyClassName(rowMessage, config.folder), unread ? "font-semibold" : "font-medium")}>
							{unread && <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" />}
							<span className="truncate">{party}</span>
							{threadCount > 1 && <span className="shrink-0 text-xs font-normal text-[var(--muted-foreground)]">{threadCount}</span>}
						</span>
						{meta}
					</span>
					<span className={clsx("mt-0.5 block truncate text-sm", unread ? "font-semibold text-[var(--foreground)]" : "text-[var(--foreground)]/80")}>
						{rowMessage.subject ?? "(no subject)"}
					</span>
					<span className="mt-0.5 line-clamp-1 block text-[13px] leading-5 text-[var(--muted-foreground)]">{preview}</span>
				</Link>
				{starred && canStar && (
					<Star className="absolute bottom-3 right-4 h-3.5 w-3.5 fill-[var(--star)] text-[var(--star)]" aria-label="Starred" />
				)}
			</div>
		);
	}

	return (
		<div
			className={clsx(
				"group relative grid min-h-[52px] w-full grid-cols-[36px_28px_minmax(140px,220px)_minmax(0,1fr)_auto] items-center gap-x-3 px-4 text-left text-sm transition-colors",
				"before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-transparent",
				rowStateClassName,
				draggable && "cursor-grab active:cursor-grabbing",
			)}
			{...dragProps}
		>
			<MessageNavigationProgress progress={navigation.progress} />
			{selectControl}
			<span className="flex items-center justify-center">{starButton}</span>
			<span className={clsx("flex min-w-0 items-center gap-2", getMessagePartyClassName(rowMessage, config.folder), unread ? "font-semibold" : "font-medium")}>
				{unread && <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" />}
				<span className="truncate">{party}</span>
				{threadCount > 1 && <span className="shrink-0 text-xs font-normal text-[var(--muted-foreground)]">{threadCount}</span>}
			</span>
			<Link
				href={href}
				onClick={onMessageNavigate}
				className="min-w-0 truncate after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-md focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-[var(--ring)]"
			>
				<span className={unread ? "font-semibold text-[var(--foreground)]" : "text-[var(--foreground)]/85"}>
					{rowMessage.subject ?? "(no subject)"}
				</span>
				<span className="text-[var(--muted-foreground)]"> — {preview}</span>
			</Link>
			<span className="relative flex min-w-[88px] items-center justify-end">
				{meta}
				{hasRowActions && (
					<span className="absolute inset-y-0 right-0 z-10 flex items-center">
						<MessageListRowActions
							message={rowMessage}
							onAction={async (action) => {
								const previousRead = read;
								const unreadDelta = action === "read" ? -1 : action === "unread" ? 1 : 0;
								if (action === "read") setRead(true);
								if (action === "unread") setRead(false);
								if (unreadDelta) dispatchMessageCountsDelta({ inboxUnreadDelta: unreadDelta });
								try {
									await onMessageAction(message.id, action);
								} catch (error) {
									if (action === "read" || action === "unread") {
										setRead(previousRead);
										if (unreadDelta) dispatchMessageCountsDelta({ inboxUnreadDelta: -unreadDelta });
									}
									throw error;
								}
							}}
						/>
					</span>
				)}
			</span>
		</div>
	);
}

function MessageListSkeleton({ compact }: { compact: boolean }) {
	return (
		<div role="status" aria-label="Loading messages" className="divide-y divide-[var(--border)]">
			{Array.from({ length: compact ? 7 : 10 }, (_, index) => (
				<div key={index} className={clsx("flex items-center gap-3", compact ? "px-4 py-3.5" : "h-[52px] px-4")}>
					<Skeleton className={clsx("shrink-0 rounded-full", compact ? "h-8 w-8" : "h-9 w-9")} />
					{compact ? (
						<div className="min-w-0 flex-1 space-y-2">
							<div className="flex justify-between gap-6">
								<Skeleton className="h-3.5 w-32" />
								<Skeleton className="h-3 w-10" />
							</div>
							<Skeleton className="h-3.5 w-4/5" />
							<Skeleton className="h-3 w-3/5" />
						</div>
					) : (
						<>
							<Skeleton className="ml-10 h-3.5 w-36 shrink-0" />
							<Skeleton className="h-3.5 flex-1" style={{ maxWidth: `${55 + ((index * 17) % 35)}%` }} />
							<Skeleton className="ml-auto h-3 w-12 shrink-0" />
						</>
					)}
				</div>
			))}
		</div>
	);
}

export function MessageFolderPage({
	config,
	compact = false,
	selectedMessageId,
	selection,
}: MessageFolderPageProps) {
	const { selectedMailbox, isLoading: mailboxesLoading } = useSelectedMailbox();
	const { query, setQuery } = useMailSearch();
	const isMobile = useIsMobile();
	const [offset, setOffset] = useState(0);
	const [internalSelectedMessages, setInternalSelectedMessages] = useState<
		Array<{ id: string; read: boolean }>
	>([]);
	const [pendingBulkAction, setPendingBulkAction] = useState(false);
	const [unreadOnly, setUnreadOnly] = useState(false);
	const [conversationView] = useConversationView();
	const grouped = conversationView && config.folder !== "drafts";
	const { messages, isLoading, total, limit, updateMessages } = useMessages(config.folder, selectedMailbox?.id, {
		query,
		limit: pageSize,
		offset,
		read: unreadOnly ? "unread" : "all",
		group: grouped ? "thread" : undefined,
	}, !mailboxesLoading, config.folderId);
	const { counts } = useMessageCounts(selectedMailbox?.id, !mailboxesLoading);
	usePageLoading(mailboxesLoading || isLoading);
	const hasActiveFilters = !!query.trim();
	const folderCount = config.folderId
		? counts.customFolders[config.folderId]
		: counts.folders[config.folder];
	const titleTotal = folderCount?.total ?? total;
	const titleUnread = folderCount?.unread ?? 0;
	const mailboxAddress = getMailboxAddress(selectedMailbox);
	const currentAccountName = selectedMailbox?.displayName ?? selectedMailbox?.localPart;
	const pageRange = getPageRange(offset, messages.length, total);
	const selectedMessages = selection?.selectedMessages ?? internalSelectedMessages;
	const setSelectedMessages =
		selection?.setSelectedMessages ?? setInternalSelectedMessages;
	const selectedIds = useMemo(
		() => selectedMessages.map((message) => message.id),
		[selectedMessages],
	);
	const hasUnreadSelection = selectedMessages.some((message) => !message.read);
	const allVisibleSelected = messages.length > 0 && messages.every((message) => selectedIds.includes(message.id));
	const someVisibleSelected = !allVisibleSelected && messages.some((message) => selectedIds.includes(message.id));
	const rowCompact = compact || isMobile;
	const showBulkToolbar = selectedIds.length > 0 && !compact;
	const emptyState = getMessageEmptyState(config, query);
	// In conversation view a row stands for every message of its thread in this
	// folder, so actions and drags carry all of them.
	const rowMessageIds = (message: Message) => message.threadMessageIds ?? [message.id];
	const expandSelectedIds = (ids: string[]) =>
		ids.flatMap((id) => rowMessageIds(messages.find((message) => message.id === id) ?? { id } as Message));

	useEffect(() => {
		setOffset(0);
		setSelectedMessages([]);
	}, [query, selectedMailbox?.id, config.folder, config.folderId, unreadOnly, grouped]);

	useEffect(() => {
		setSelectedMessages([]);
	}, [offset]);

	useEffect(() => {
		if (mailboxesLoading) return;
		document.title = formatEmailPageTitle({
			location: config.title,
			total: titleTotal,
			unread: titleUnread,
			emailAddress: mailboxAddress,
		});
	}, [config.title, mailboxAddress, mailboxesLoading, titleTotal, titleUnread]);

	function updateSelectedMessage(messageId: string, selected: boolean) {
		const message = messages.find((item) => item.id === messageId);
		if (!message) return;

		setSelectedMessages((current) => {
			if (!selected) return current.filter((item) => item.id !== messageId);
			if (current.some((item) => item.id === messageId)) return current;
			return [...current, { id: message.id, read: message.read && !(message.threadUnread ?? 0) }];
		});
	}

	function toggleAllVisible(selected: boolean) {
		const visibleIds = new Set(messages.map((message) => message.id));
		setSelectedMessages((current) => {
			if (!selected) {
				return current.filter((message) => !visibleIds.has(message.id));
			}

			const next = new Map(current.map((message) => [message.id, message]));
			for (const message of messages) {
				next.set(message.id, { id: message.id, read: message.read && !(message.threadUnread ?? 0) });
			}
			return Array.from(next.values());
		});
	}

	async function runSelectedAction(action: BulkMessageAction) {
		if (selectedIds.length === 0) return;

		setPendingBulkAction(true);
		const previousMessages = messages;
		const readValue = action === "read" ? true : action === "unread" ? false : null;
		const changedMessages = readValue === null
			? []
			: messages.filter((message) => selectedIds.includes(message.id) && message.read !== readValue);
		if (readValue !== null) {
			updateMessages((current) => current.map((message) =>
				selectedIds.includes(message.id) ? { ...message, read: readValue } : message,
			));
			setSelectedMessages((current) => current.map((message) => ({ ...message, read: readValue })));
			const inboxUnreadDelta = changedMessages
				.filter((message) => message.direction === "inbound")
				.reduce((total, message) => total + (readValue ? (message.read ? 0 : -1) : (message.read ? 1 : 0)), 0);
			if (inboxUnreadDelta) dispatchMessageCountsDelta({ inboxUnreadDelta });
		}
		try {
			await runBulkMessageAction(expandSelectedIds(selectedIds), action);
			setSelectedMessages([]);
		} catch (error) {
			if (readValue !== null) {
				updateMessages(previousMessages);
				const inboxUnreadDelta = changedMessages
					.filter((message) => message.direction === "inbound")
					.reduce((total, message) => total + (readValue ? (message.read ? 0 : 1) : (message.read ? -1 : 0)), 0);
				if (inboxUnreadDelta) dispatchMessageCountsDelta({ inboxUnreadDelta });
			}
			throw error;
		} finally {
			setPendingBulkAction(false);
		}
	}

	return (
		<div className="flex h-full min-h-0 flex-col bg-[var(--card)]">
			<div className={clsx("flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--card)]", compact ? "px-4" : "px-4 sm:px-5")}>
				<Tooltip label={allVisibleSelected ? "Clear selection" : "Select all on this page"}>
					<Checkbox
						checked={allVisibleSelected}
						ref={(element) => {
							if (element) element.indeterminate = someVisibleSelected;
						}}
						disabled={messages.length === 0}
						onChange={(event) => toggleAllVisible(event.target.checked)}
						aria-label="Select all visible messages"
					/>
				</Tooltip>
				{showBulkToolbar ? (
					<BulkMessageToolbar
						selectedCount={selectedIds.length}
						hasUnreadSelection={hasUnreadSelection}
						onAction={runSelectedAction}
						onClearSelection={() => setSelectedMessages([])}
						pending={pendingBulkAction}
					/>
				) : (
					<div className="flex min-w-0 flex-1 items-baseline gap-2">
						<h1 className={clsx("truncate font-semibold tracking-tight text-[var(--foreground)]", compact ? "text-sm" : "text-[15px]")}>
							{selectedIds.length > 0 ? `${selectedIds.length} selected` : config.title}
						</h1>
						{selectedIds.length === 0 && titleUnread > 0 && config.folder !== "sent" && config.folder !== "drafts" && (
							<span className="shrink-0 text-xs font-medium text-[var(--primary)]">{titleUnread} unread</span>
						)}
					</div>
				)}
				{(!showBulkToolbar) && (
					<div className="ml-auto flex shrink-0 items-center gap-1 text-[var(--muted-foreground)]">
						{total > 0 && (
							<span className="hidden whitespace-nowrap px-1 text-xs tabular-nums sm:inline">
								{pageRange.start}–{pageRange.end} of {pageRange.total}
							</span>
						)}
						<Tooltip label="Newer">
							<Button
								variant="ghost"
								size="icon-sm"
								disabled={offset === 0 || isLoading}
								onClick={() => setOffset(Math.max(offset - limit, 0))}
								aria-label="Newer messages"
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>
						</Tooltip>
						<Tooltip label="Older">
							<Button
								variant="ghost"
								size="icon-sm"
								disabled={offset + messages.length >= total || isLoading}
								onClick={() => setOffset(offset + limit)}
								aria-label="Older messages"
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</Tooltip>
						{config.folder === "inbox" && (
							<Tooltip label={unreadOnly ? "Show all mail" : "Show unread only"}>
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									aria-label="Show unread emails only"
									aria-pressed={unreadOnly}
									onClick={() => setUnreadOnly((current) => !current)}
								>
									<ListFilter className="h-4 w-4" />
								</Button>
							</Tooltip>
						)}
					</div>
				)}
			</div>

			<div className="min-h-0 flex-1 divide-y divide-[var(--border)] overflow-y-auto overscroll-contain scrollbar-gutter-stable" aria-busy={isLoading}>
				{messages.map((message) => (
					<MessageListRow
						key={message.id}
						message={message}
						config={config}
						selected={selectedIds.includes(message.id)}
						selectionActive={selectedIds.length > 0}
						active={message.id === selectedMessageId}
						compact={rowCompact}
						currentAccountName={currentAccountName}
						onSelectedChange={updateSelectedMessage}
						onMessageAction={(messageId, action) =>
							runBulkMessageAction(expandSelectedIds([messageId]), action, action !== "read" && action !== "unread")
						}
						dragMessageIds={expandSelectedIds(selectedIds.includes(message.id) ? selectedIds : [message.id])}
					/>
				))}
				{(isLoading || mailboxesLoading) && messages.length === 0 && <MessageListSkeleton compact={rowCompact} />}
				{!isLoading && !mailboxesLoading && messages.length === 0 && (
					<EmptyState
						icon={emptyState.icon}
						title={unreadOnly && !hasActiveFilters ? "No unread mail" : emptyState.title}
						description={unreadOnly && !hasActiveFilters ? "Everything in this folder has been read." : emptyState.description}
						compact={compact}
						action={hasActiveFilters ? (
							<Button variant="outline" size="sm" onClick={() => setQuery("")}>Clear search</Button>
						) : unreadOnly ? (
							<Button variant="outline" size="sm" onClick={() => setUnreadOnly(false)}>Show all mail</Button>
						) : undefined}
					/>
				)}
			</div>
		</div>
	);
}
