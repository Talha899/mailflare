"use client";

import { createElement, useEffect, useState } from "react";
import { Ban, FileCode2, Forward, Mail, MailOpen, MoreVertical, Reply, ReplyAll, Star } from "lucide-react";
import { useCompose } from "@/components/compose/compose-context";
import { MessageSourceDialog } from "@/components/messages/message-source-dialog";
import { getOwnAddressForMessage } from "@/app/(dashboard)/inbox/[messageId]/utils";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import {
	blockMessageContact,
	createForwardDraft,
	createReplyDraft,
	getMoveMessageActions,
	getReplyRecipients,
	getReplyThreading,
	hasAdditionalRecipients,
	runSingleMessageAction,
} from "@/components/message-actions/utils";
import { toggleMessageStar } from "./message-list-row-actions-utils";
import type { ThreadMessageActionsProps } from "./thread-message-actions-types";
import type { ReplyMode } from "@/components/message-actions/types";

export function ThreadMessageActions({
	message,
	mailboxId,
	ownAddress,
	ownAddresses = [],
	starOnly = false,
}: ThreadMessageActionsProps) {
	const { openDraftComposer } = useCompose();
	const [starred, setStarred] = useState(message.starred);
	const [moreOpen, setMoreOpen] = useState(false);
	const [sourceOpen, setSourceOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const canReplyAll = hasAdditionalRecipients(message, ownAddresses);
	const moveActions = getMoveMessageActions(message.status, message.direction);
	const replyFromAddress = ownAddresses.length > 0
		? getOwnAddressForMessage(message, ownAddresses)
		: ownAddress;

	useEffect(() => setStarred(message.starred), [message.starred]);
	useEffect(() => {
		if (starOnly) setMoreOpen(false);
	}, [starOnly]);

	async function onToggleStar() {
		setPending(true);
		setError(null);
		try {
			setStarred(await toggleMessageStar(message.id));
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : "Unable to update star");
		} finally {
			setPending(false);
		}
	}

	async function onReply(mode: ReplyMode) {
		setMoreOpen(false);
		setPending(true);
		setError(null);
		try {
			const draftId = await createReplyDraft({
				mailboxId,
				senderAddress: message.fromAddr,
				ownAddress: replyFromAddress,
				subject: message.subject,
				bodyText: message.textBody,
				bodyHtml: message.htmlBody,
				sentAt: message.createdAt,
				recipients: getReplyRecipients(message, ownAddresses, mode),
				threading: getReplyThreading(message),
			});
			openDraftComposer(draftId);
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : "Could not start reply");
		} finally {
			setPending(false);
		}
	}

	async function onForward() {
		setMoreOpen(false);
		setPending(true);
		setError(null);
		try {
			const draftId = await createForwardDraft({
				mailboxId,
				ownAddress: replyFromAddress,
				message,
				bodyText: message.textBody,
				bodyHtml: message.htmlBody,
			});
			openDraftComposer(draftId);
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : "Could not start forward");
		} finally {
			setPending(false);
		}
	}

	async function onMessageAction(action: Parameters<typeof runSingleMessageAction>[1]) {
		setMoreOpen(false);
		setPending(true);
		setError(null);
		try {
			await runSingleMessageAction(message.id, action);
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : "Could not update message");
		} finally {
			setPending(false);
		}
	}

	async function onBlock() {
		if (!mailboxId) return;
		setMoreOpen(false);
		setPending(true);
		setError(null);
		try {
			await blockMessageContact({ mailboxId, senderAddress: message.fromAddr });
			await runSingleMessageAction(message.id, "trash");
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : "Could not block contact");
		} finally {
			setPending(false);
		}
	}

	return (
		<div className="flex items-center gap-0.5">
			{error && <span className="mr-1 max-w-32 truncate text-xs text-[var(--destructive)]" title={error}>{error}</span>}
			<Tooltip label={starred ? "Remove star" : "Star"}>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-8 w-8 px-0"
					aria-label={starred ? "Remove star" : "Star"}
					aria-pressed={starred}
					disabled={pending}
					onClick={() => void onToggleStar()}
				>
					<Star className={starred ? "h-4 w-4 fill-[var(--primary)] text-[var(--primary)]" : "h-4 w-4"} />
				</Button>
			</Tooltip>
			{!starOnly && (
				<>
			<Tooltip label="Reply">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-8 w-8 px-0"
					aria-label="Reply"
					disabled={pending}
					onClick={() => void onReply("reply")}
				>
					<Reply className="h-4 w-4" />
				</Button>
			</Tooltip>
			<div className="relative">
				<Tooltip label="More actions">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-8 w-8 px-0"
						aria-label="More actions"
						aria-expanded={moreOpen}
						disabled={pending}
						onClick={() => setMoreOpen((open) => !open)}
					>
						<MoreVertical className="h-4 w-4" />
					</Button>
				</Tooltip>
				{moreOpen && (
					<div className="absolute right-0 z-30 mt-1.5 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 text-[var(--foreground)] shadow-[0_16px_40px_-18px_rgba(0,0,0,0.28)]">
						<button type="button" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium tracking-tight transition-colors hover:bg-[var(--muted)] active:scale-[0.99]" onClick={() => void onReply("reply")}>
							<Reply className="h-3.5 w-3.5 text-[var(--muted-foreground)]" /> Reply
						</button>
						{canReplyAll && (
							<button type="button" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium tracking-tight transition-colors hover:bg-[var(--muted)] active:scale-[0.99]" onClick={() => void onReply("replyAll")}>
								<ReplyAll className="h-3.5 w-3.5 text-[var(--muted-foreground)]" /> Reply all
							</button>
						)}
						<button type="button" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium tracking-tight transition-colors hover:bg-[var(--muted)] active:scale-[0.99]" onClick={() => void onForward()}>
							<Forward className="h-3.5 w-3.5 text-[var(--muted-foreground)]" /> Forward
						</button>
						<button type="button" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium tracking-tight transition-colors hover:bg-[var(--muted)] active:scale-[0.99]" onClick={() => { setMoreOpen(false); setSourceOpen(true); }}>
							<FileCode2 className="h-3.5 w-3.5 text-[var(--muted-foreground)]" /> Show original
						</button>
						<div className="my-1 h-px bg-[var(--border)]" />
						<button type="button" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium tracking-tight transition-colors hover:bg-[var(--muted)] active:scale-[0.99]" onClick={() => void onMessageAction(message.read ? "unread" : "read")}>
							{message.read ? <Mail className="h-3.5 w-3.5 text-[var(--muted-foreground)]" /> : <MailOpen className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />}
							{message.read ? "Mark as unread" : "Mark as read"}
						</button>
						{moveActions.map((item) => (
							<button key={item.action} type="button" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium tracking-tight transition-colors hover:bg-[var(--muted)] active:scale-[0.99]" onClick={() => void onMessageAction(item.action)}>
								<span className="text-[var(--muted-foreground)]">{createElement(item.icon, { size: 14 })}</span> {item.label}
							</button>
						))}
						{message.direction === "inbound" && mailboxId && (
							<>
								<div className="my-1 h-px bg-[var(--border)]" />
								<button type="button" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium tracking-tight text-[var(--destructive)] transition-colors hover:bg-[color-mix(in_oklab,var(--destructive)_10%,var(--card))] active:scale-[0.99]" onClick={() => void onBlock()}>
									<Ban className="h-3.5 w-3.5" /> Block contact
								</button>
							</>
						)}
					</div>
				)}
			</div>
			<MessageSourceDialog messageId={message.id} open={sourceOpen} onOpenChange={setSourceOpen} />
				</>
			)}
		</div>
	);
}
