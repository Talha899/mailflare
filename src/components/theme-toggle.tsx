"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import {
	readThemePreference,
	saveThemePreference,
	THEME_CHANGED_EVENT,
	type ThemePreference,
} from "@/components/theme-utils";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemePreference; icon: typeof Sun; label: string }[] = [
	{ value: "light", icon: Sun, label: "Light" },
	{ value: "dark", icon: Moon, label: "Dark" },
	{ value: "system", icon: Monitor, label: "System" },
];

export function ThemeToggle({ className }: { className?: string }) {
	const [preference, setPreference] = useState<ThemePreference>("system");

	useEffect(() => {
		setPreference(readThemePreference());
		const onChange = () => setPreference(readThemePreference());
		window.addEventListener(THEME_CHANGED_EVENT, onChange);
		return () => window.removeEventListener(THEME_CHANGED_EVENT, onChange);
	}, []);

	return (
		<div
			className={cn(
				"flex gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--card)] p-0.5",
				className,
			)}
			role="group"
			aria-label="Theme"
		>
			{OPTIONS.map((option) => {
				const Icon = option.icon;
				const active = preference === option.value;
				return (
					<button
						key={option.value}
						type="button"
						title={option.label}
						aria-pressed={active}
						className={cn(
							"flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs transition-colors active:scale-[0.98]",
							active
								? "bg-[var(--accent)] font-medium text-[var(--foreground)]"
								: "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
						)}
						onClick={() => {
							saveThemePreference(option.value);
							setPreference(option.value);
						}}
					>
						<Icon className="h-3.5 w-3.5" />
						<span className="sr-only sm:not-sr-only">{option.label}</span>
					</button>
				);
			})}
		</div>
	);
}
