"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Menus with full keyboard support (arrows, typeahead, Escape, focus return)
 * from Radix. Use for row actions, account menus and overflow menus.
 */
export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuSub = DropdownMenuPrimitive.Sub;
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

export function DropdownMenuContent({
	className,
	sideOffset = 6,
	align = "end",
	...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>) {
	return (
		<DropdownMenuPrimitive.Portal>
			<DropdownMenuPrimitive.Content
				sideOffset={sideOffset}
				align={align}
				collisionPadding={12}
				className={cn(
					"popover-content z-[200] min-w-[12rem] max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto",
					"rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-1 text-[var(--foreground)] shadow-[var(--shadow-lg)]",
					className,
				)}
				{...props}
			/>
		</DropdownMenuPrimitive.Portal>
	);
}

const itemClassName = cn(
	"relative flex min-h-8 cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm outline-none",
	"text-[var(--foreground)] data-[highlighted]:bg-[var(--hover)]",
	"data-[disabled]:pointer-events-none data-[disabled]:opacity-45",
	"[&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0 [&_svg]:text-[var(--muted-foreground)]",
);

export function DropdownMenuItem({
	className,
	destructive = false,
	...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { destructive?: boolean }) {
	return (
		<DropdownMenuPrimitive.Item
			className={cn(
				itemClassName,
				destructive && "text-[var(--destructive)] data-[highlighted]:bg-[var(--destructive-soft)] [&_svg]:text-[var(--destructive)]",
				className,
			)}
			{...props}
		/>
	);
}

export function DropdownMenuCheckboxItem({
	className,
	children,
	...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>) {
	return (
		<DropdownMenuPrimitive.CheckboxItem className={cn(itemClassName, "pr-8", className)} {...props}>
			{children}
			<DropdownMenuPrimitive.ItemIndicator className="absolute right-2.5 inline-flex">
				<Check className="!text-[var(--primary)]" />
			</DropdownMenuPrimitive.ItemIndicator>
		</DropdownMenuPrimitive.CheckboxItem>
	);
}

export function DropdownMenuRadioItem({
	className,
	children,
	...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>) {
	return (
		<DropdownMenuPrimitive.RadioItem className={cn(itemClassName, "pr-8", className)} {...props}>
			{children}
			<DropdownMenuPrimitive.ItemIndicator className="absolute right-2.5 inline-flex">
				<Check className="!text-[var(--primary)]" />
			</DropdownMenuPrimitive.ItemIndicator>
		</DropdownMenuPrimitive.RadioItem>
	);
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>) {
	return (
		<DropdownMenuPrimitive.Label
			className={cn("px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--subtle-foreground)]", className)}
			{...props}
		/>
	);
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>) {
	return <DropdownMenuPrimitive.Separator className={cn("mx-1 my-1 h-px bg-[var(--border)]", className)} {...props} />;
}

export function DropdownMenuShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
	return <span className={cn("ml-auto pl-4 font-mono text-[11px] text-[var(--subtle-foreground)]", className)} {...props} />;
}
