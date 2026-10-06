"use client";

import { Switch } from "@/components/ui/switch";
import { useTwoColumnReading } from "@/components/messages/use-two-column-reading";

export function InboxReadingLayoutSettings() {
	const [twoColumnReading, setTwoColumnReading] = useTwoColumnReading();

	return (
		<label className="flex items-start gap-3 rounded-xl bg-[var(--muted)] p-4">
			<span className="flex-1">
				<span className="block text-sm font-medium text-[var(--foreground)]">Two column reading view</span>
				<span className="mt-1 block text-sm text-[var(--muted-foreground)]">
					Show the email list beside an open email. Turn this off to read emails in one column.
				</span>
			</span>
			<Switch checked={twoColumnReading} onCheckedChange={setTwoColumnReading} aria-label="Two column reading view" />
		</label>
	);
}
