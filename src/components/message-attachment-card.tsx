"use client";

import { ArrowDownToLine, Play } from "lucide-react";
import { formatAttachmentSize } from "@/app/(dashboard)/inbox/[messageId]/utils";
import type { MessageAttachmentCardProps } from "./message-attachment-card-types";
import { getAttachmentFileUrl } from "./message-attachment-viewer-utils";
import { getAttachmentVisual } from "./message-attachment-card-utils";

export function MessageAttachmentCard({
	attachment,
	messageId,
	onPreview,
}: MessageAttachmentCardProps) {
	const visual = getAttachmentVisual(attachment);
	const Icon = visual.icon;
	const previewUrl = getAttachmentFileUrl(messageId, attachment.id, "preview");

	return (
		<button
			type="button"
			onClick={() => onPreview(attachment)}
			className="group flex w-full items-center gap-3 rounded-lg border border-[var(--border)] p-2.5 text-left transition-colors hover:border-[var(--border)] hover:bg-[var(--muted)]"
		>
			{visual.thumbnail === "image" && (
				<img
					src={previewUrl}
					alt=""
					loading="lazy"
					className="h-14 w-14 shrink-0 rounded-md bg-[var(--muted)] object-cover"
				/>
			)}
			{visual.thumbnail === "video" && (
				<span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-[var(--primary)]">
					<video
						src={previewUrl}
						muted
						preload="metadata"
						playsInline
						className="h-full w-full object-cover"
					/>
					<span className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_oklab,var(--foreground)_20%,transparent)]">
						<Play className="h-5 w-5 fill-current text-[var(--primary-foreground)]" />
					</span>
				</span>
			)}
			{visual.thumbnail === null && (
				<span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-md ${visual.iconClassName}`}>
					<Icon className="h-6 w-6" />
				</span>
			)}
			<span className="min-w-0 flex-1 text-left">
				<span className="block truncate text-sm font-medium text-[var(--foreground)]">
					{attachment.filename}
				</span>
				<span className="mt-0.5 block truncate text-xs text-[var(--muted-foreground)]">
					{visual.label} · {formatAttachmentSize(attachment.size)}
				</span>
			</span>
			<ArrowDownToLine className="h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-colors group-hover:text-[var(--compose)]" />
		</button>
	);
}
