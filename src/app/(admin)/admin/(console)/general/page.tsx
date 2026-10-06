"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadGeneralSettings, saveGeneralSettings } from "./utils";

export default function GeneralSettingsPage() {
	const [maxMb, setMaxMb] = useState(25);
	const [loaded, setLoaded] = useState(false);
	const [saving, setSaving] = useState(false);
	const [status, setStatus] = useState("");

	useEffect(() => {
		let active = true;
		void loadGeneralSettings().then((settings) => {
			if (active) { setMaxMb(settings.outboundAttachmentMaxMb); setLoaded(true); }
		}).catch((error) => { if (active) setStatus(error instanceof Error ? error.message : "Could not load settings"); });
		return () => { active = false; };
	}, []);

	async function save(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		setStatus("");
		try {
			const settings = await saveGeneralSettings(maxMb);
			setMaxMb(settings.outboundAttachmentMaxMb);
			setStatus("Attachment limit saved");
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Could not save settings");
		} finally { setSaving(false); }
	}

	return <div className="space-y-6">
		<div><h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">General</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Set limits for outgoing mail.</p></div>
		<Card className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
			<CardHeader className="py-0"><CardTitle>File attachments</CardTitle></CardHeader>
			<CardContent className="pt-6"><form onSubmit={save} className="space-y-4">
				<div className="space-y-2"><Label htmlFor="attachment-limit">Maximum attachments per email (MB)</Label><Input id="attachment-limit" type="number" min="1" max="25" step="1" value={maxMb} onChange={(event) => setMaxMb(Number(event.target.value))} disabled={!loaded || saving} className="max-w-40" required /><p className="text-sm text-[var(--muted-foreground)]">Applies to each file and all files combined. Maximum: 25 MB; up to 10 files.</p></div>
				<div className="space-y-2 rounded-xl bg-[var(--muted)] p-4 text-sm text-[var(--foreground)]"><p>Large files are stored and sent as download links instead of being attached to the message, so SMTP size limits are not exceeded. Links expire after 30 days. Anyone with a link can download the file until it expires.</p><p>Set APP_URL to your public HTTPS address so download links work from API sends and background jobs.</p></div>
				{status && <p role="status" className="text-sm text-[var(--foreground)]">{status}</p>}
				<Button type="submit" disabled={!loaded || saving || !Number.isInteger(maxMb) || maxMb < 1 || maxMb > 25}>{saving ? "Saving…" : "Save settings"}</Button>
			</form></CardContent>
		</Card>
	</div>;
}
