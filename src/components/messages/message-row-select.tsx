"use client";

import { Check } from "lucide-react";
import { ContactAvatar } from "@/components/contacts/contact-avatar";
import { cn } from "@/lib/utils";

/**
 * The sender's avatar doubles as the row's selection checkbox, as in most mail
 * clients: hovering (or any active selection) reveals the check, tapping it on
 * a phone selects the row. It is one real checkbox for assistive technology.
 */
export function MessageRowSelect({
	selected,
	selectionActive,
	onSelectedChange,
	label,
	mailboxId,
	address,
	name,
	hasManagedAvatar = false,
	size = "md",
}: {
	selected: boolean;
	/** True while any row is selected, so every row shows its check box. */
	selectionActive: boolean;
	onSelectedChange: (selected: boolean) => void;
	label: string;
	mailboxId?: string | null;
	address: string;
	name: string;
	hasManagedAvatar?: boolean;
	size?: "sm" | "md";
}) {
	const dimension = size === "sm" ? "h-8 w-8" : "h-9 w-9";
	const showCheck = selected || selectionActive;
	return (
		<button
			type="button"
			role="checkbox"
			aria-checked={selected}
			aria-label={label}
			onClick={(event) => {
				event.preventDefault();
				event.stopPropagation();
				onSelectedChange(!selected);
			}}
			className={cn(
				"group/select relative z-10 flex shrink-0 items-center justify-center rounded-full",
				dimension,
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]",
			)}
		>
			<ContactAvatar
				mailboxId={mailboxId ?? undefined}
				address={address}
				name={name}
				hasManagedAvatar={hasManagedAvatar}
				className={cn(
					dimension,
					"text-[13px] transition-opacity duration-150",
					showCheck ? "opacity-0" : "group-hover:opacity-0 group-focus-visible/select:opacity-0",
				)}
			/>
			<span
				aria-hidden
				className={cn(
					"absolute inset-0 flex items-center justify-center rounded-full border-2 transition-[opacity,background-color,border-color] duration-150",
					selected
						? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] opacity-100"
						: cn(
								"border-[var(--border-strong)] bg-[var(--card)] text-transparent",
								showCheck ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible/select:opacity-100",
							),
				)}
			>
				<Check className="h-4 w-4" strokeWidth={3} />
			</span>
		</button>
	);
}
