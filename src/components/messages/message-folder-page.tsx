"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { ChevronLeft, ChevronRight, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useConversationView } from "./use-conversation-view";
import type { MessageFolderPageProps, MessageListRowProps } from "./types";
import {
	formatMessageListTimestamp,
	getPageRange,
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
	active = false,
	compact = false,
	currentAccountName,
	onSelectedChange,
	onMessageAction,
	dragMessageIds,
}: MessageListRowProps) {
	const Icon = config.icon;
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
	const preview = getMessagePreview(rowMessage, config.folder);
	const href = `${config.hrefPrefix}/${message.id}`;
	const navigation = useMessageNavigation(href, rowMessage);

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
		navigation.onNavigate(event, !read);
	}

	if (compact && config.folder !== "drafts") {
		return (
			<div
				className={clsx(
					"group relative grid grid-cols-[20px_minmax(0,1fr)] gap-3 border-l-[3px] px-4 py-3 transition-colors",
					active && "border-l-[var(--primary)] bg-[var(--accent)]",
					!active && selected && "border-l-[var(--primary)]/40 bg-[var(--muted)]",
					!active && !selected && unread && "border-l-[var(--primary)]/25 bg-[var(--card)]",
					!active && !selected && !unread && "border-l-transparent hover:bg-[var(--muted)]/70",
					draggable && "cursor-grab active:cursor-grabbing",
				)}
				draggable={draggable}
				onDragStart={(event) => {
					if (!draggable) return;
					setMessageDragData(event.dataTransfer, { messageIds: dragMessageIds });
				}}
			>
				{unread && !active && !selected && (
					<span
						aria-hidden
						className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-sm bg-[var(--primary)]"
					/>
				)}
				<MessageNavigationProgress progress={navigation.progress} />
				<Checkbox
					checked={selected}
					onChange={(event) => onSelectedChange(message.id, event.target.checked)}
					className="mt-1 h-4 w-4 rounded border-[var(--border)]"
					aria-label={`Select message from ${party}`}
				/>
				<Link href={href} onClick={onMessageNavigate} className="min-w-0">
					<span className="flex items-baseline justify-between gap-3">
						<span className={clsx(unread && "font-semibold", getMessagePartyClassName(message, config.folder))}>
							{party}

							{(message.threadCount ?? 1) > 1 && (
								<span className="ml-2 text-xs font-normal text-[var(--muted-foreground)]">{message.threadCount}</span>
							)}
						</span>
						<span className={clsx(unread ? "font-medium text-[var(--foreground)]" : "text-[var(--muted-foreground)]", "shrink-0 text-[11px] tabular-nums")}>
							{formatMessageListTimestamp(message.createdAt)}
						</span>
					</span>
					<span
						className={clsx(
							"mt-1 block truncate text-sm",
							unread ? "font-semibold text-[var(--foreground)]" : "text-[var(--foreground)]/75",
						)}
					>
						{message.subject ?? "(no subject)"}
					</span>
					<span className="mt-0.5 block truncate text-xs leading-5 text-[var(--muted-foreground)]">
						{preview}
					</span>
				</Link>
			</div>
		);
	}

	const className = clsx(
		"group relative grid min-h-12 w-full grid-cols-[24px_32px_minmax(160px,260px)_1fr_auto] items-center gap-3 border-l-[3px] px-5 text-left text-sm transition-colors",
		active && "border-l-[var(--primary)] bg-[var(--accent)]",
		!active && selected && "border-l-[var(--primary)]/40 bg-[var(--muted)]",
		!active && !selected && unread && "border-l-[var(--primary)]/20 hover:bg-[var(--muted)]/60",
		!active && !selected && !unread && "border-l-transparent hover:bg-[var(--muted)]/50",
		draggable && "cursor-grab active:cursor-grabbing",
	);
	const content = (
		<>
			{config.folder === "inbox" && message.direction === "inbound" && (
				<Tooltip label={starred ? "Starred" : "Not starred"}>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();
							void toggleMessageStar(message.id).then((result) => setStarred(result.starred));
						}}
						aria-label={starred ? "Starred" : "Not starred"}
					>
						<Icon className={`h-4 w-4 ${starred ? "fill-[var(--primary)] text-[var(--primary)]" : "text-[var(--border)]"}`} />
					</Button>
				</Tooltip>
			)}
			{(config.folder !== "inbox" || message.direction !== "inbound") && (
				<Icon className="h-4 w-4 text-[var(--border)]" />
			)}
			<span className={clsx("flex items-center gap-2", unread && "font-semibold", getMessagePartyClassName(rowMessage, config.folder))}>
				{unread && (
					<span
						aria-hidden
						className="h-1.5 w-1.5 shrink-0 rounded-sm bg-[var(--primary)]"
					/>
				)}
				{party}

				{(message.threadCount ?? 1) > 1 && (
					<span className="ml-1 text-xs font-normal text-[var(--muted-foreground)]">{message.threadCount}</span>
				)}
			</span>
			<span className="truncate text-[var(--foreground)]/80">
				<span className={unread ? "font-semibold text-[var(--foreground)]" : ""}>
					{rowMessage.subject ?? "(no subject)"}
				</span>
				<span className="text-[var(--muted-foreground)]"> — {getMessagePreview(rowMessage, config.folder)}</span>
			</span>
			<time
				dateTime={message.createdAt}
				className={clsx(
					"min-w-[96px] whitespace-nowrap text-right text-xs tabular-nums group-hover:opacity-0",
					unread ? "font-semibold text-[var(--foreground)]" : "text-[var(--muted-foreground)]",
				)}
			>
				{formatMessageListTimestamp(message.createdAt)}
			</time>
		</>
	);

	if (config.folder === "drafts") {
		return (
			<div className={className}>
				<Checkbox
					checked={selected}
					onChange={(event) => onSelectedChange(message.id, event.target.checked)}
					className="h-4 w-4 rounded border-[var(--border)]"
					aria-label="Select message"
				/>
				<Link href={href} className="contents text-left">
					{content}
				</Link>
			</div>
		);
	}

	return (
		<div
			className={className}
			draggable={draggable}
			onDragStart={(event) => {
				if (!draggable) return;
				setMessageDragData(event.dataTransfer, { messageIds: dragMessageIds });
			}}
		>
			<MessageNavigationProgress progress={navigation.progress} />
			<Checkbox
				checked={selected}
				onChange={(event) => onSelectedChange(message.id, event.target.checked)}
				className="h-4 w-4 rounded border-[var(--border)]"
				aria-label="Select message"
			/>
			<Link href={href} onClick={onMessageNavigate} className="contents">
				{content}
			</Link>
			{(config.folder === "inbox" || config.folder === "snoozed") && message.direction === "inbound" && (
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
			)}
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
	const { query } = useMailSearch();
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
	const headerIcons = config.headerIcons ?? [];
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
		<div className="flex h-full min-h-0 flex-col">
			<div className={`flex h-12 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] ${compact ? "px-4" : "px-5"}`}>
				<div className="flex items-center gap-3 w-full">
					<Tooltip label="Select all visible messages">
						<Checkbox
							checked={allVisibleSelected}
							disabled={messages.length === 0}
							onChange={(event) => toggleAllVisible(event.target.checked)}
							className="h-4 w-4 rounded border-[var(--border)]"
							aria-label="Select all visible messages"
						/>
					</Tooltip>
					{selectedIds.length > 0 && !compact ? (
						<BulkMessageToolbar
							selectedCount={selectedIds.length}
							hasUnreadSelection={hasUnreadSelection}
							onAction={runSelectedAction}
							onClearSelection={() => setSelectedMessages([])}
							pending={pendingBulkAction}
						/>
					) : (
						compact && (
							<>
								{/* <h1 className="truncate text-sm font-semibold text-[var(--foreground)]">
									{config.title}
								</h1>
								<Badge variant="secondary">{total}</Badge> */}
							</>
						)
					)}
				</div>
				{(selectedIds.length === 0 || compact) && (
					<div className="flex items-center gap-2 text-[var(--muted-foreground)]">
						<span className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">
							{pageRange.start} - {pageRange.end} of {pageRange.total}
						</span>
						<Tooltip label="Previous page">
							<Button
								variant="ghost"
								size="sm"
								disabled={offset === 0 || isLoading}
								onClick={() => setOffset(Math.max(offset - limit, 0))}
								aria-label="Previous page"
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>
						</Tooltip>
						<Tooltip label="Next page">
							<Button
								variant="ghost"
								size="sm"
								disabled={offset + messages.length >= total || isLoading}
								onClick={() => setOffset(offset + limit)}
								aria-label="Next page"
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</Tooltip>
						{config.folder === "inbox" && (
							<Tooltip label={unreadOnly ? "Showing unread emails" : "Show unread emails only"}>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									aria-label="Show unread emails only"
									aria-pressed={unreadOnly}
									onClick={() => setUnreadOnly((current) => !current)}
									className={unreadOnly ? "bg-[var(--accent)] text-[var(--primary)] hover:bg-[var(--accent)]" : undefined}
								>
									<ListFilter className="h-4 w-4" />
								</Button>
							</Tooltip>
						)}
						{!compact && headerIcons.map((Icon, index) => (
							<Icon key={index} className="h-4 w-4" />
						))}
					</div>
				)}
			</div>

			<div className="min-h-0 flex-1 divide-y divide-[var(--border)] overflow-y-auto overscroll-contain scrollbar-gutter-stable">
				{messages.map((message) => (
					<MessageListRow
						key={message.id}
						message={message}
						config={config}
						selected={selectedIds.includes(message.id)}
						active={message.id === selectedMessageId}
						compact={compact || isMobile}
						currentAccountName={currentAccountName}
						onSelectedChange={updateSelectedMessage}
						onMessageAction={(messageId, action) =>
							runBulkMessageAction(expandSelectedIds([messageId]), action, action !== "read" && action !== "unread")
						}
						dragMessageIds={expandSelectedIds(selectedIds.includes(message.id) ? selectedIds : [message.id])}
					/>
				))}
				{!isLoading && messages.length === 0 && (
					<p className="px-6 py-4 text-sm text-[var(--muted-foreground)]">
						{hasActiveFilters ? "No messages match these filters" : config.emptyText}
					</p>
				)}
			</div>
		</div>
	);
}
