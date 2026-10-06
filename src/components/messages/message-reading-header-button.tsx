"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Columns2 } from "lucide-react";
import clsx from "clsx";
import { Tooltip } from "@/components/ui/tooltip";
import { useMessageListVisibility } from "./message-list-visibility";
import type { MessageReadingHeaderButtonProps } from "./message-reading-header-button-types";

const buttonClassName =
	"relative z-10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-colors duration-150 hover:bg-[var(--hover)] hover:text-[var(--foreground)]";

/**
 * Below the two-column breakpoint the list is never beside the message, so the
 * reader always offers a way back. On wide screens it toggles the list column.
 */
export function MessageReadingHeaderButton({ assistantVisible }: MessageReadingHeaderButtonProps) {
	const router = useRouter();
	const { visible, toggle, singleColumn, backHref, backLabel } = useMessageListVisibility();
	const backButton = (
		<Tooltip label={`Back to ${backLabel}`} className={singleColumn ? "inline-flex" : "inline-flex lg:hidden"}>
			<button type="button" className={buttonClassName} onClick={() => router.push(backHref)} aria-label={`Back to ${backLabel}`}>
				<ArrowLeft size={18} />
			</button>
		</Tooltip>
	);
	if (singleColumn) return backButton;

	const label = assistantVisible ? null : visible ? "Hide email list" : "Show email list";
	return (
		<>
			{backButton}
			<Tooltip label={label} className="hidden lg:inline-flex">
				<button
					type="button"
					className={clsx(buttonClassName, assistantVisible ? "opacity-40" : !visible && "opacity-70 hover:opacity-100")}
					onClick={toggle}
					disabled={assistantVisible}
					aria-label={label ?? "Email list unavailable"}
					aria-pressed={visible}
				>
					<Columns2 size={18} />
				</button>
			</Tooltip>
		</>
	);
}
