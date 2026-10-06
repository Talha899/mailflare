const STORAGE_KEY = "mailflare-assistant-enabled";

function storageKey(mailboxId?: string | null) {
	return mailboxId ? `${STORAGE_KEY}:${mailboxId}` : STORAGE_KEY;
}

/** Drop cached availability so the next paint refetches instead of flashing a stale value. */
function clearAssistantAvailabilityCache() {
	if (typeof window === "undefined") return;
	try {
		const keys: string[] = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key === STORAGE_KEY || key?.startsWith(`${STORAGE_KEY}:`)) keys.push(key);
		}
		for (const key of keys) localStorage.removeItem(key);
	} catch {
		/* Storage is optional. */
	}
}

export function readInitialAssistantAvailability(mailboxId?: string | null): boolean | null {
	if (typeof window === "undefined") return null;
	try {
		const stored = localStorage.getItem(storageKey(mailboxId));
		return stored === null ? null : stored === "true";
	} catch {
		return null;
	}
}

export function saveAssistantAvailability(enabled: boolean, mailboxId?: string | null) {
	try {
		if (!mailboxId) {
			// Admin/global writes must invalidate per-mailbox keys the dashboard actually reads.
			clearAssistantAvailabilityCache();
			return;
		}
		localStorage.setItem(storageKey(mailboxId), String(enabled));
	} catch {
		/* Storage is optional. */
	}
}
