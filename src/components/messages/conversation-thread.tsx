"use client";

import { useEffect, useState } from "react";
import { formatUserDate } from "@/lib/time/utils";
import { ChevronsUpDown, Paperclip } from "lucide-react";
import { ContactAvatar } from "@/components/contacts/contact-avatar";
import { QuotedEmailToggle } from "@/components/messages/quoted-email-toggle";
import { runSingleMessageAction } from "@/components/message-actions/utils";
import { sanitizeEmailHtml } from "@/app/(dashboard)/inbox/[messageId]/email-html-sanitizer";
import { collapseQuotedEmailHtml } from "@/app/(dashboard)/inbox/[messageId]/quote-collapse-utils";
import { getMessageBodyDisplay, resolveInlineAttachmentUrls } from "@/app/(dashboard)/inbox/[messageId]/utils";

import { cn } from "@/lib/utils";
import type { ConversationMessageCardProps, ConversationThreadProps } from "./conversation-thread-types";
import { ThreadMessageActions } from "./thread-message-actions";
import {
	getConversationRecipients,
	getConversationSender,
	getConversationSenderEmail,
	partitionThread,
} from "./conversation-thread-utils";
import clsx from "clsx";
import { useMessageListVisibility } from "./message-list-visibility";
import { useAssistantOpen } from "../agent/assistant-open-state";

/**
 * The other messages in a conversation, ordered oldest to newest and collapsed
 * until opened. Readers can also expand the full visible portion at once.
 */
export function ConversationThread({
	currentMessageId,
	position,
	messages,
	mailboxId,
	currentAccountName,
	ownAddress,
	ownAddresses,
	latestMessagesFirst,
	expandedAll,
	onExpandedAllChange,
	showFullRecipientAddresses = false,
}: ConversationThreadProps) {
	const slice = partitionThread(messages, currentMessageId, position, latestMessagesFirst);
	if (slice.length === 0) return null;
	const firstMessage = slice[0];
	const lastMessage = slice.at(-1)!;
	const middleMessages = slice.slice(1, -1);
	const collapsed = !expandedAll && middleMessages.length > 0;
	const collapsedLabel = `${middleMessages.length} ${position === "before" ? "older" : "newer"} message${middleMessages.length === 1 ? "" : "s"}`;

	return (
		<section
			aria-label={position === "before" ? "Earlier messages in this conversation" : "Later messages in this conversation"}
			className={cn(position === (latestMessagesFirst ? "before" : "after") ? "pb-6" : "")}
		>
			<ol className={cn(!collapsed && "divide-y divide-[var(--border)]", latestMessagesFirst ? "border-t" : "border-b", "border-[var(--border)]")}>
				<li className={"border-t-0"}>
					<ConversationMessageCard
						message={firstMessage}
						mailboxId={mailboxId}
						currentAccountName={currentAccountName}
						ownAddress={ownAddress}
						ownAddresses={ownAddresses}
						showFullRecipientAddresses={showFullRecipientAddresses}
					/>
				</li>
				{collapsed ? (
					<li className="flex items-center justify-center gap-1 py-2 text-center border-y border-[var(--border)] h-px my-4">
						<span className="bg-[var(--card)] px-6 flex flex-row items-center gap-2">
							<span className="text-sm font-medium text-[var(--muted-foreground)]">{collapsedLabel}</span>
							<button
								type="button"
								onClick={() => onExpandedAllChange(true)}
								aria-label={`Expand ${collapsedLabel}`}
								title={`Expand ${collapsedLabel}`}
								className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
							>
								<ChevronsUpDown className="h-4 w-4" />
							</button>
						</span>
					</li>
				) : (
					middleMessages.map((message) => (
						<li key={message.id}>
							<ConversationMessageCard
								message={message}
								mailboxId={mailboxId}
								currentAccountName={currentAccountName}
								ownAddress={ownAddress}
								ownAddresses={ownAddresses}
								showFullRecipientAddresses={showFullRecipientAddresses}
							/>
						</li>
					))
				)}
				{lastMessage.id !== firstMessage.id && (
					<li>
						<ConversationMessageCard
							message={lastMessage}
							mailboxId={mailboxId}
							currentAccountName={currentAccountName}
							ownAddress={ownAddress}
							ownAddresses={ownAddresses}
							showFullRecipientAddresses={showFullRecipientAddresses}
						/>
					</li>
				)}
			</ol>
		</section>
	);
}

export function ConversationMessageCard({
	message,
	mailboxId,
	currentAccountName,
	ownAddress,
	ownAddresses,
	defaultExpanded = false,
	showFullRecipientAddresses = false,
}: ConversationMessageCardProps) {
	const [locallyExpanded, setLocallyExpanded] = useState(defaultExpanded);
	const [locallyRead, setLocallyRead] = useState(message.read);
	const expanded = locallyExpanded;
	const sender = getConversationSender(message, currentAccountName);
	const senderEmail = getConversationSenderEmail(message);
	const recipients = getConversationRecipients(message, showFullRecipientAddresses ? "full" : "address");
	// const href = `${getMessageBackHref(message.direction, message.status)}/${message.id}`;
	const outbound = message.direction === "outbound";
	const attachments = message.attachments.filter((attachment) => attachment.disposition === "attachment");
	const { visible: messageListVisible } = useMessageListVisibility();
	const isAssistantOpen = useAssistantOpen();
	const isAnyPanelVisible = messageListVisible || isAssistantOpen;

	useEffect(() => setLocallyRead(message.read), [message.read]);

	let body: { html: string | null; text: string; quotedHtml: string | null } | null = null;
	if (expanded) {
		const display = getMessageBodyDisplay(message.textBody, message.htmlBody, message.snippet);
		body = {
			html: collapseQuotedEmailHtml(sanitizeEmailHtml(resolveInlineAttachmentUrls(display.htmlBody, message.id, message.attachments))),
			text: display.latestContent,
			quotedHtml: collapseQuotedEmailHtml(sanitizeEmailHtml(resolveInlineAttachmentUrls(display.quotedHtml, message.id, message.attachments)), true),
		};
	}


	return (
		<article className={cn("bg-[var(--card)] transition-colors px-6", !expanded && "hover:bg-[var(--muted)]", !isAnyPanelVisible && "pl-12")}>
			<div className="w-full">
				<div className="flex w-full flex-wrap items-start gap-x-3 py-3 pl-4">
					<button
						type="button"
						onClick={() => {
							const shouldExpand = !locallyExpanded;
							setLocallyExpanded(shouldExpand);
							if (!shouldExpand || locallyRead) return;
							setLocallyRead(true);
							void runSingleMessageAction(message.id, "read").catch(() => setLocallyRead(false));
						}}
						aria-expanded={expanded}
						className="flex min-w-0 flex-1 basis-40 items-center gap-3 text-left cursor-pointer"
					>
						<ContactAvatar
							mailboxId={mailboxId}
							address={message.fromAddr}
							name={sender}
							hasManagedAvatar={message.fromContactHasAvatar}
							managedAvatarUrl={outbound && mailboxId ? `/api/mailboxes/${mailboxId}/avatar` : undefined}
							className={expanded ? "mt-1" : ""}
						/>
						<span className="min-w-0 flex-1">
							<div className="flex flex-col">
								<span className={cn("truncate text-sm font-semibold mt-1", locallyRead || outbound ? "text-[var(--foreground)]" : "font-semibold text-[var(--foreground)]")}>
									{sender}
									{expanded && <span className="text-xs ml-1 opacity-50 font-normal">&lt;{senderEmail}&gt;</span>}
								</span>
								{expanded && recipients && <span className="text-xs font-normal text-[var(--muted-foreground)]">to {recipients}</span>}
							</div>
							{!expanded && (
								<span className={clsx(!locallyRead ? "font-semibold" : "text-[var(--muted-foreground)]", "block truncate text-[13px]")}>{message.snippet || "No preview"}</span>
							)}
						</span>
					</button>
					<span className={clsx(!locallyRead ? "font-semibold" : "", "flex shrink-0 items-center gap-2 text-xs mr-2 mt-2")}>
						{attachments.length > 0 && <Paperclip className="h-3.5 w-3.5" aria-label={`${attachments.length} attachments`} />}
						{formatUserDate(message.createdAt, { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
					</span>
					<ThreadMessageActions
						message={message}
						mailboxId={mailboxId}
						ownAddress={ownAddress}
						ownAddresses={ownAddresses}
						starOnly={!expanded}
					/>
				</div>
				{expanded && body && (
					<div className="pb-4 pl-16 pt-2">
						{body.html ? (
							<div className="email-body max-w-none text-sm text-[var(--foreground)]" dangerouslySetInnerHTML={{ __html: body.html }} />
						) : (
							<pre className="whitespace-pre-wrap font-sans text-sm text-[var(--foreground)]">{body.text}</pre>
						)}
						{body.quotedHtml && <QuotedEmailToggle html={body.quotedHtml} />}
						{attachments.length > 0 && (
							<ul className="mt-4 flex flex-wrap gap-2">
								{attachments.map((attachment) => (
									<li key={attachment.id}>
										<a
											href={`/api/messages/${message.id}/attachments/${attachment.id}`}
											className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs text-[var(--foreground)] hover:bg-[var(--muted)]"
										>
											<Paperclip className="h-3 w-3" />
											<span className="max-w-48 truncate">{attachment.filename}</span>
										</a>
									</li>
								))}
							</ul>
						)}
					</div>
				)}
			</div>
		</article>
	);
}
