"use client";

import Link from "next/link";
import { TextAlignJustify } from "lucide-react";
import { useBranding } from "./branding-provider";
import { useSidebar } from "./sidebar-state";
import type { SidebarHeaderProps } from "./sidebar-state-types";
import { Tooltip } from "./ui/tooltip";

export function SidebarHeader({ href, label }: SidebarHeaderProps) {
	const branding = useBranding();
	const { minimal, toggle } = useSidebar();
	const toggleButton = (
		<button
			type="button"
			onClick={toggle}
			className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] active:scale-[0.98]"
			aria-label={minimal ? "Expand menu" : "Collapse menu"}
		>
			{minimal ? (
				<img src={branding.iconUrl} height={24} width={24} alt="" className="rounded-md" />
			) : (
				<TextAlignJustify size={18} />
			)}
		</button>
	);
	return (
		<div className={`mb-3 flex h-9 items-center ${minimal ? "" : "gap-2 px-1"}`}>
			{minimal ? (
				<Tooltip label="Expand menu" placement="right">
					{toggleButton}
				</Tooltip>
			) : (
				toggleButton
			)}
			{!minimal && (
				<Link href={href} className="flex min-w-0 items-center gap-2.5">
					<img src={branding.iconUrl} height={24} width={24} alt="" className="rounded-md" />
					<span className="truncate text-base font-semibold tracking-tight text-[var(--foreground)]">
						{label ?? branding.appName}
					</span>
				</Link>
			)}
		</div>
	);
}
