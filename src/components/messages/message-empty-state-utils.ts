import { Archive, Clock, FileText, Folder, Inbox, Search, Send, ShieldCheck, Star, Trash2 } from "lucide-react";
import type { MessageFolderConfig } from "./types";

type EmptyStateCopy = {
	icon: typeof Inbox;
	title: string;
	description: string;
};

const copy: Record<string, EmptyStateCopy> = {
	inbox: { icon: Inbox, title: "You're all caught up", description: "New mail for this mailbox shows up here as soon as it arrives." },
	starred: { icon: Star, title: "No starred mail", description: "Star a conversation to keep it one click away." },
	snoozed: { icon: Clock, title: "Nothing snoozed", description: "Snoozed mail leaves the inbox and comes back at the time you pick." },
	sent: { icon: Send, title: "No sent mail yet", description: "Messages you send from this mailbox are kept here." },
	drafts: { icon: FileText, title: "No drafts", description: "Unsent messages are saved here automatically while you write." },
	archived: { icon: Archive, title: "Archive is empty", description: "Archive mail to clear your inbox without deleting anything." },
	spam: { icon: ShieldCheck, title: "No spam", description: "Mail flagged as spam is held here, away from your inbox." },
	trash: { icon: Trash2, title: "Trash is empty", description: "Deleted mail stays here until you remove it for good." },
};

/** Icon and copy for an empty folder, or for a search that matched nothing. */
export function getMessageEmptyState(config: Pick<MessageFolderConfig, "folder" | "folderId" | "title">, query: string): EmptyStateCopy {
	if (query.trim()) {
		return {
			icon: Search,
			title: "No messages match your search",
			description: `Nothing in ${config.title} matches “${query.trim()}”. Try fewer words or a different spelling.`,
		};
	}
	if (config.folderId) {
		return { icon: Folder, title: `${config.title} is empty`, description: "Drag mail here from the list, or file it with Move to." };
	}
	return copy[config.folder] ?? { icon: Inbox, title: "No messages", description: "There is nothing here yet." };
}
