"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SelectOptionItem, SelectProps } from "./select-types";
import { EMPTY_SELECT_VALUE, readSelectOptions, toRadixValue, fromRadixValue } from "./select-utils";

/**
 * Custom select with the native element's API: pass `value` + `onChange` (the
 * handler receives an event-like object with `target.value`) and `<option>` /
 * `<optgroup>` children. Rendering, keyboard behaviour (arrows, Home/End,
 * typeahead, Escape) and ARIA come from Radix, so no browser-default dropdown
 * is ever shown.
 */
export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(function Select(
	{
		value,
		defaultValue,
		onChange,
		onValueChange,
		children,
		className,
		containerClassName,
		disabled,
		required,
		name,
		id,
		placeholder,
		size = "default",
		"aria-label": ariaLabel,
		"aria-labelledby": ariaLabelledBy,
		"aria-describedby": ariaDescribedBy,
		"aria-invalid": ariaInvalid,
	},
	ref,
) {
	const groups = React.useMemo(() => readSelectOptions(children), [children]);
	const options = React.useMemo(() => groups.flatMap((group) => group.options), [groups]);
	const [uncontrolled, setUncontrolled] = React.useState(() => String(defaultValue ?? options[0]?.value ?? ""));
	const current = value !== undefined && value !== null ? String(value) : uncontrolled;
	const selected = options.find((option) => option.value === current);
	const emptyOption = options.find((option) => option.value === "");
	const placeholderText = placeholder ?? emptyOption?.label ?? "Select…";

	function handleChange(next: string) {
		const nextValue = fromRadixValue(next);
		if (value === undefined) setUncontrolled(nextValue);
		onValueChange?.(nextValue);
		if (onChange) {
			const target = { value: nextValue, name: name ?? "", id: id ?? "" };
			onChange({ target, currentTarget: target } as unknown as React.ChangeEvent<HTMLSelectElement>);
		}
	}

	return (
		<SelectPrimitive.Root
			value={selected ? toRadixValue(current) : undefined}
			onValueChange={handleChange}
			disabled={disabled}
			name={name}
		>
			<SelectPrimitive.Trigger
				ref={ref}
				id={id}
				aria-label={ariaLabel}
				aria-labelledby={ariaLabelledBy}
				aria-describedby={ariaDescribedBy}
				aria-invalid={ariaInvalid}
				className={cn(
					"group inline-flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-left text-sm text-[var(--foreground)]",
					size === "sm" ? "h-8 px-2.5" : "h-9 px-3",
					"shadow-[var(--shadow-sm)] transition-[border-color,box-shadow,background-color] duration-150",
					"hover:border-[var(--border-strong)]",
					"focus-visible:outline-none focus-visible:border-[var(--ring)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ring)_25%,transparent)]",
					"data-[state=open]:border-[var(--ring)] data-[state=open]:ring-2 data-[state=open]:ring-[color-mix(in_oklab,var(--ring)_25%,transparent)]",
					"aria-[invalid=true]:border-[var(--destructive)]",
					"disabled:cursor-not-allowed disabled:opacity-50",
					containerClassName,
					className,
				)}
			>
				<span className={cn("min-w-0 flex-1 truncate", (!selected || selected.value === "") && "text-[var(--muted-foreground)]")}>
					{selected && selected.value !== "" ? selected.label : placeholderText}
				</span>
				<ChevronDown
					className="h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform duration-150 group-data-[state=open]:rotate-180"
					aria-hidden
				/>
			</SelectPrimitive.Trigger>
			{required && (
				// Keeps native form validation for required selects.
				<input
					tabIndex={-1}
					aria-hidden
					required
					value={current}
					onChange={() => undefined}
					className="pointer-events-none absolute h-px w-px opacity-0"
				/>
			)}
			<SelectPrimitive.Portal>
				<SelectPrimitive.Content
					position="popper"
					sideOffset={6}
					collisionPadding={12}
					className={cn(
						"popover-content z-[200] max-h-[min(22rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden",
						"rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--foreground)] shadow-[var(--shadow-lg)]",
					)}
				>
					<SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center text-[var(--muted-foreground)]">
						<ChevronUp className="h-4 w-4" />
					</SelectPrimitive.ScrollUpButton>
					<SelectPrimitive.Viewport className="p-1">
						{groups.map((group, groupIndex) => (
							<SelectPrimitive.Group key={group.label ?? `group-${groupIndex}`}>
								{groupIndex > 0 && <SelectPrimitive.Separator className="mx-2 my-1 h-px bg-[var(--border)]" />}
								{group.label && (
									<SelectPrimitive.Label className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--subtle-foreground)]">
										{group.label}
									</SelectPrimitive.Label>
								)}
								{group.options.map((option) => (
									<SelectItem key={option.value || EMPTY_SELECT_VALUE} option={option} />
								))}
							</SelectPrimitive.Group>
						))}
						{options.length === 0 && (
							<p className="px-2.5 py-2 text-sm text-[var(--muted-foreground)]">No options</p>
						)}
					</SelectPrimitive.Viewport>
					<SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center text-[var(--muted-foreground)]">
						<ChevronDown className="h-4 w-4" />
					</SelectPrimitive.ScrollDownButton>
				</SelectPrimitive.Content>
			</SelectPrimitive.Portal>
		</SelectPrimitive.Root>
	);
});

function SelectItem({ option }: { option: SelectOptionItem }) {
	return (
		<SelectPrimitive.Item
			value={toRadixValue(option.value)}
			disabled={option.disabled}
			className={cn(
				"relative flex min-h-8 cursor-pointer select-none items-center gap-2 rounded-md py-1.5 pl-2.5 pr-8 text-sm outline-none",
				"data-[highlighted]:bg-[var(--hover)] data-[state=checked]:font-medium",
				"data-[disabled]:pointer-events-none data-[disabled]:opacity-45",
			)}
		>
			<SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
			<SelectPrimitive.ItemIndicator className="absolute right-2.5 inline-flex items-center text-[var(--primary)]">
				<Check className="h-4 w-4" />
			</SelectPrimitive.ItemIndicator>
		</SelectPrimitive.Item>
	);
}
