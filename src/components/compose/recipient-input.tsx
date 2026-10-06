"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { getEmailAddress } from "@/lib/email/address";
import { cn } from "@/lib/utils";
import type { RecipientInputProps } from "./recipient-input-types";
import { getRecipientLabel, isValidRecipient, parseRecipientEntries } from "./recipient-utils";

/**
 * A To/Cc/Bcc row. Addresses become chips as soon as the user types a comma,
 * presses Enter or Tab, pastes a list, or leaves the field; Backspace on an
 * empty field pulls the last chip back out for editing.
 */
export function RecipientInput({
	id,
	label,
	value,
	onChange,
	placeholder,
	disabled,
	required,
	autoFocus,
	trailing,
}: RecipientInputProps) {
	const [draft, setDraft] = useState("");
	const inputRef = useRef<HTMLInputElement | null>(null);

	function commit(raw = draft) {
		const entries = parseRecipientEntries(raw, value);
		if (entries.length > 0) onChange([...value, ...entries]);
		setDraft("");
	}

	function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.key === "," || event.key === ";" || event.key === "Enter" || (event.key === "Tab" && draft.trim())) {
			if (event.key !== "Tab") event.preventDefault();
			commit();
			return;
		}
		if (event.key === "Backspace" && !draft && value.length > 0) {
			event.preventDefault();
			const last = value[value.length - 1];
			onChange(value.slice(0, -1));
			setDraft(last);
		}
	}

	return (
		<div
			className="flex min-h-9 items-center gap-2 border-b border-[var(--border)] px-4 py-1"
			onClick={() => inputRef.current?.focus()}
		>
			<Label htmlFor={id} className="w-8 shrink-0 text-[13px] text-[var(--muted-foreground)]">
				{label}
			</Label>
			<div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
				{value.map((entry) => {
					const valid = isValidRecipient(entry);
					return (
						<span
							key={entry}
							title={getEmailAddress(entry)}
							className={cn(
								"inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 text-xs tracking-tight",
								valid
									? "border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)]"
									: "border-[color-mix(in_oklab,var(--destructive)_35%,var(--border))] bg-[color-mix(in_oklab,var(--destructive)_10%,var(--card))] text-[var(--destructive)]",
							)}
						>
							<span className="truncate">{getRecipientLabel(entry)}</span>
							{!disabled && (
								<button
									type="button"
									aria-label={`Remove ${getEmailAddress(entry)}`}
									className="rounded-md p-0.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--card)] hover:text-[var(--foreground)] active:scale-[0.98]"
									onClick={(event) => {
										event.stopPropagation();
										onChange(value.filter((item) => item !== entry));
									}}
								>
									<X className="h-3 w-3" />
								</button>
							)}
						</span>
					);
				})}
				<input
					ref={inputRef}
					id={id}
					value={draft}
					onChange={(event) => {
						// A pasted list should split immediately instead of waiting for a comma.
						if (/[,;]/.test(event.target.value) && event.target.value.length - draft.length > 1) {
							commit(event.target.value);
							return;
						}
						setDraft(event.target.value);
					}}
					onKeyDown={onKeyDown}
					onBlur={() => commit()}
					type="text"
					autoComplete="off"
					autoFocus={autoFocus}
					spellCheck={false}
					placeholder={value.length === 0 ? placeholder : undefined}
					disabled={disabled}
					// Native `required` would block submit while chips exist; the form checks itself.
					aria-required={required}
					className="h-7 min-w-32 flex-1 border-0 bg-transparent p-0 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] disabled:cursor-not-allowed"
				/>
			</div>
			{trailing && (
				// Toggles live inside the clickable row; keep their clicks from refocusing this field.
				<div
					className="flex shrink-0 items-center gap-1 text-xs font-medium text-[var(--muted-foreground)]"
					onClick={(event) => event.stopPropagation()}
				>
					{trailing}
				</div>
			)}
		</div>
	);
}
