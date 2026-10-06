import Link from "next/link";
import type { DragEvent, MouseEvent } from "react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { getMessageDragData } from "@/lib/messages/drag-utils";
import { useSelectedMailbox } from "./mailbox-provider";
import { useSidebar } from "./sidebar-state";
import { useCompose } from "./compose/compose-context";
import { Tooltip } from "./ui/tooltip";
import {
	preloadMailboxPage,
	waitForNavigationProgress,
} from "./components-nav-utils";
import type { NavLink } from "./components-nav-types";

export function NavItem({ link }: { link: NavLink }) {
	const pathname = usePathname();
	const router = useRouter();
	const { openComposer } = useCompose();
	const { selectedMailbox } = useSelectedMailbox();
	const { minimal } = useSidebar();
	const [dragOver, setDragOver] = useState(false);
	const [navigationProgress, setNavigationProgress] = useState<number | null>(
		null,
	);

	useEffect(() => {
		if (navigationProgress === null) return;
		setNavigationProgress(100);
		const timer = window.setTimeout(() => setNavigationProgress(null), 220);
		return () => window.clearTimeout(timer);
	}, [pathname]);

	if (!link.href) {
		return <span className="flex-1" />;
	}

	const Icon = link.icon;
	if (!Icon) return null;
	const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
	const classes = cn(
		"flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium text-[var(--muted-foreground)] transition-colors",
		minimal && "relative mx-auto w-10 justify-center rounded-lg px-0",
		active
			? "bg-[var(--accent)] font-semibold text-[var(--accent-foreground)]"
			: "hover:bg-[color-mix(in_oklab,var(--sidebar)_60%,var(--border))] hover:text-[var(--foreground)]",
		dragOver && "bg-[var(--accent)] text-[var(--accent-foreground)] ring-2 ring-[var(--primary)]/40",
		link.primary &&
			"mb-4 h-11 w-full rounded-xl bg-[var(--compose)] px-4 font-semibold text-[var(--compose-foreground)] shadow-[var(--shadow-md)] hover:bg-[var(--primary-hover)] hover:text-[var(--compose-foreground)]",
		link.primary && active && "bg-[var(--compose)] text-[var(--compose-foreground)]",
		link.primary && minimal && "h-10 w-10 rounded-xl px-0",
	);
	const dropProps = link.onMessageDrop
		? {
				onDragOver: (event: DragEvent) => {
					event.preventDefault();
					event.dataTransfer.dropEffect = "move";
					setDragOver(true);
				},
				onDragLeave: () => setDragOver(false),
				onDrop: (event: DragEvent) => {
					const payload = getMessageDragData(event.dataTransfer);
					setDragOver(false);
					if (!payload) return;
					event.preventDefault();
					link.onMessageDrop?.(payload.messageIds);
				},
			}
		: {};

	if (link.href === "/compose") {
		const composeButton = (
			<button
				type="button"
				onClick={openComposer}
				className={classes}
				aria-label={minimal ? link.label : undefined}
				{...dropProps}
			>
				<Icon
					size={18}
					style={{ color: link.iconColor }}
				/>
				{!minimal && (
					<span className={cn("flex-1", typeof link.count === "number" && link.count > 0 && "font-semibold")}>
						{link.label}
					</span>
				)}
				{!minimal && typeof link.count === "number" && link.count > 0 && (
					<span className="ml-auto rounded-md bg-[var(--card)]/40 px-1.5 py-0.5 text-xs font-semibold tabular-nums">
						{link.count > 99 ? "99+" : link.count}
					</span>
				)}
				{minimal && typeof link.count === "number" && link.count > 0 && (
					<span className="absolute -right-1 -top-1 min-w-4 rounded-md bg-[var(--card)] px-1 text-center text-[10px] font-semibold leading-4 text-[var(--primary)]">
						{link.count > 99 ? "99+" : link.count}
					</span>
				)}
			</button>
		);
		return minimal && link.label ? (
			<Tooltip label={link.label} placement="right" className="mx-auto">
				{composeButton}
			</Tooltip>
		) : (
			composeButton
		);
	}

	async function navigate(event: MouseEvent<HTMLAnchorElement>) {
		if (
			!link.preloadMessages ||
			active ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey
		)
			return;
		event.preventDefault();
		setNavigationProgress(12);
		const timer = window.setInterval(() => {
			setNavigationProgress((current) =>
				current === null ? 12 : Math.min(90, current + 8),
			);
		}, 80);
		try {
			router.prefetch(link.href!);
			await Promise.all([
				preloadMailboxPage(link.href!, selectedMailbox?.id),
				waitForNavigationProgress(),
			]);
			setNavigationProgress(100);
			await waitForNavigationProgress(160);
			router.push(link.href!);
		} catch {
			setNavigationProgress(null);
		} finally {
			window.clearInterval(timer);
		}
	}

	const navLink = (
		<Link
			href={link.href}
			onClick={navigate}
			aria-label={minimal ? link.label : undefined}
			className={classes}
			{...dropProps}
		>
			<Icon
				style={{ color: link.iconColor }}
				size={16}
			/>
			{!minimal && (
				<span className={cn("flex-1", typeof link.count === "number" && link.count > 0 && "font-semibold")}>
					{link.label}
				</span>
			)}
			{!minimal && typeof link.count === "number" && link.count > 0 && (
				<span className={cn("ml-auto min-w-6 rounded-full px-1.5 text-center text-xs font-semibold leading-5 tabular-nums", active ? "text-[var(--accent-foreground)]" : "text-[var(--foreground)]")}>
					{link.count > 99 ? "99+" : link.count}
				</span>
			)}
			{minimal && typeof link.count === "number" && link.count > 0 && (
				<span className="absolute -right-1 -top-1 min-w-4 rounded-md bg-[var(--primary)] px-1 text-center text-[10px] font-semibold leading-4 text-[var(--primary-foreground)]">
					{link.count > 99 ? "99+" : link.count}
				</span>
			)}
		</Link>
	);

	return (
		<>
			{navigationProgress !== null && (
				<div className="fixed inset-x-0 top-0 z-[120] h-0.5 bg-[var(--accent)]">
					<div
						className="h-full bg-[var(--primary)] transition-[width] duration-100 ease-out"
						style={{ width: `${navigationProgress}%` }}
					/>
				</div>
			)}
			{minimal && link.label ? (
				<Tooltip label={link.label} placement="right" className="mx-auto">
					{navLink}
				</Tooltip>
			) : (
				navLink
			)}
		</>
	);
}
