"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import {
	areBrowserNotificationsEnabled,
	setBrowserNotificationsEnabled,
} from "@/hooks/message-realtime-utils";

export function BrowserNotificationSettings() {
	const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
	const [enabled, setEnabled] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const refresh = () => {
			setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
			setEnabled(areBrowserNotificationsEnabled());
		};
		refresh();
		window.addEventListener("focus", refresh);
		window.addEventListener("storage", refresh);
		return () => {
			window.removeEventListener("focus", refresh);
			window.removeEventListener("storage", refresh);
		};
	}, []);

	return (
		<div>
			<label className="flex items-start gap-3 rounded-xl bg-[var(--muted)] p-4">
				<span className="flex-1">
					<span className="block text-sm font-medium text-[var(--foreground)]">Browser notifications</span>
					<span className="mt-1 block text-sm text-[var(--muted-foreground)]">
						Show a notification for new email while Dispatch is open in a background tab.
					</span>
				</span>
				<Switch
					checked={permission === "granted" && enabled}
					disabled={permission === "unsupported" || permission === "denied"}
					onCheckedChange={(nextEnabled) => {
						setError(null);
						if (!nextEnabled) {
							try {
								setBrowserNotificationsEnabled(false);
								setEnabled(false);
							} catch {
								setError("Could not save the notification preference in this browser.");
							}
							return;
						}
						void (async () => {
							try {
								const nextPermission = permission === "granted" ? permission : await Notification.requestPermission();
								setPermission(nextPermission);
								if (nextPermission !== "granted") return;
								setBrowserNotificationsEnabled(true);
								setEnabled(true);
							} catch {
								setError("Could not enable browser notifications.");
							}
						})();
					}}
					aria-label="Enable browser notifications"
				/>
			</label>
			{permission === "denied" && (
				<p className="mt-2 px-4 text-sm text-[var(--muted-foreground)]">Notifications are blocked. Allow them in your browser&apos;s site settings to enable this option.</p>
			)}
			{permission === "unsupported" && (
				<p className="mt-2 px-4 text-sm text-[var(--muted-foreground)]">Browser notifications are unavailable here.</p>
			)}
			{error && <p className="mt-2 px-4 text-sm text-[var(--destructive)]">{error}</p>}
		</div>
	);
}
