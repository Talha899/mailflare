"use client";

import { Switch } from "@/components/ui/switch";
import { useConversationView } from "@/components/messages/use-conversation-view";
import { useLatestMessagesFirst } from "@/components/messages/use-latest-messages-first";

export function InboxThreadingSettings() {
	const [conversationView, setConversationView] = useConversationView();
	const [latestMessagesFirst, setLatestMessagesFirst] = useLatestMessagesFirst();

	return (
		<div className="space-y-3">
			<label className="flex items-start gap-3 rounded-xl bg-[var(--muted)] p-4">
				<span className="flex-1">
					<span className="block text-sm font-medium text-[var(--foreground)]">Group emails into conversations</span>
					<span className="mt-1 block text-sm text-[var(--muted-foreground)]">
						Show related messages together as a single thread in message lists.
					</span>
				</span>
				<Switch checked={conversationView} onCheckedChange={setConversationView} />
			</label>
			<label className="flex items-start gap-3 rounded-xl bg-[var(--muted)] p-4">
				<span className="flex-1">
					<span className="block text-sm font-medium text-[var(--foreground)]">Sort latest messages first</span>
					<span className="mt-1 block text-sm text-[var(--muted-foreground)]">
						Show the newest email at the top of a conversation. Turn this off to show it last.
					</span>
				</span>
				<Switch checked={latestMessagesFirst} onCheckedChange={setLatestMessagesFirst} />
			</label>
		</div>
	);
}
