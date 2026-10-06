"use client";

import { useState } from "react";
import { CornerDownRight, Pencil, Trash2 } from "lucide-react";
import type { QueuedAgentMessagesProps } from "./types";

export function QueuedAgentMessages({ messages, running, onRemove, onEdit, onSteer }: QueuedAgentMessagesProps) {
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editText, setEditText] = useState("");
	if (!messages.length) return null;
	return <div className="mx-auto w-full max-w-3xl px-3" aria-label="Queued assistant messages"><div className="max-h-48 overflow-y-auto rounded-t-2xl border border-b-0 border-[var(--border)] bg-[var(--accent)]/70 px-2 py-1 shadow-sm">
		{messages.map((item) => <div key={item.id} className="flex min-w-0 items-center gap-2 rounded-xl px-2 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--card)]/70">
			<CornerDownRight size={15} className="shrink-0 text-[var(--muted-foreground)]" aria-hidden="true" />
			{editingId === item.id ? <form className="flex min-w-0 flex-1 items-center gap-2" onSubmit={(event) => { event.preventDefault(); if (!editText.trim()) return; onEdit(item.id, editText); setEditingId(null); }}><textarea autoFocus rows={2} className="min-w-0 flex-1 resize-y rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1 outline-none focus:border-[var(--ring)]" value={editText} onChange={(event) => setEditText(event.target.value)} aria-label="Edit queued message" /><button type="submit" className="shrink-0 font-medium text-[var(--primary)]" disabled={!editText.trim()}>Save</button><button type="button" className="shrink-0 text-[var(--muted-foreground)]" onClick={() => setEditingId(null)}>Cancel</button></form> : <><span className="min-w-0 flex-1 truncate" title={item.text}>{item.text}</span><button type="button" className="shrink-0 rounded-lg px-2 py-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--primary)]" onClick={() => onSteer(item.id)} title={running ? "Stop the current response and send this message next" : "Send this queued message now"}>{running ? "Steer" : "Send now"}</button><button type="button" className="shrink-0 rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--primary)]" aria-label="Edit queued message" title="Edit queued message" onClick={() => { setEditingId(item.id); setEditText(item.text); }}><Pencil size={15} /></button><button type="button" className="shrink-0 rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[color-mix(in_oklab,var(--destructive)_12%,var(--card))] hover:text-[var(--destructive)]" aria-label="Remove queued message" title="Remove queued message" onClick={() => onRemove(item.id)}><Trash2 size={15} /></button></>}
		</div>)}
	</div></div>;
}
