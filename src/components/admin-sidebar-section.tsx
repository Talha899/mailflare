"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSidebar } from "./sidebar-state";
import { cn } from "@/lib/utils";
import { Tooltip } from "./ui/tooltip";

/** Single entry to the admin portal — keeps mail UI free of nested admin chrome. */
export function AdminSidebarSection({ className }: { className?: string }) {
	const user = useCurrentUser();
	const { minimal } = useSidebar();
	if (user?.role !== "admin") return null;

	const link = (
		<Link
			href="/admin"
			className={cn(
				"flex h-9 items-center gap-3 rounded-r-full px-3 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
				minimal && "relative mx-auto w-10 justify-center rounded-full px-0",
			)}
			aria-label={minimal ? "Admin portal" : undefined}
		>
			<LayoutDashboard className="h-[19px] w-[19px] shrink-0" />
			{!minimal && <span>Admin portal</span>}
		</Link>
	);

	return (
		<div className={cn("mt-3 border-t border-[var(--border)] pt-3", className)}>
			{minimal ? <Tooltip label="Admin portal">{link}</Tooltip> : link}
		</div>
	);
}
