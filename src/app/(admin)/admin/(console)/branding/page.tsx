"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, ImagePlus, LockKeyhole, Palette } from "lucide-react";
import { useBranding } from "@/components/branding-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRANDING_ICON_ACCEPT, saveBranding } from "./utils";

export default function BrandingPage() {
	const branding = useBranding();
	const [appName, setAppName] = useState(branding.appName);
	const [icon, setIcon] = useState<File | null>(null);
	const [preview, setPreview] = useState<string | null>(null);
	const [status, setStatus] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setAppName(branding.appName);
	}, [branding.appName]);

	if (!branding.canCustomizeBranding) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Branding</h1>
					<p className="mt-2 text-sm text-[var(--muted-foreground)]">Custom branding is available with a Pro or Team license.</p>
				</div>
				<Card className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
					<CardHeader className="py-0">
						<CardTitle className="flex items-center gap-2"><LockKeyhole className="h-5 w-5" />License required</CardTitle>
						<CardDescription>This installation continues to use the original Dispatch name, app icon, and favicon.</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-3 pt-6 sm:flex-row">
						<Button asChild><a href="https://app.paymug.co/buy/mailflare-pro" target="_blank" rel="noopener noreferrer">Buy Pro · $29 <ExternalLink className="h-4 w-4" /></a></Button>
						<Button asChild variant="outline"><a href="https://app.paymug.co/buy/mailflare-team" target="_blank" rel="noopener noreferrer">Buy Team · from $249 <ExternalLink className="h-4 w-4" /></a></Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	function pickIcon(file: File | null) {
		setIcon(file);
		if (preview) URL.revokeObjectURL(preview);
		setPreview(file ? URL.createObjectURL(file) : null);
	}

	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		setStatus(null);
		try {
			await saveBranding(appName.trim(), icon);
			await branding.refreshBranding();
			setIcon(null);
			setStatus("Branding updated");
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Unable to save branding");
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Branding</h1>
				<p className="mt-2 text-sm text-[var(--muted-foreground)]">Customize the app identity shown to everyone using this installation.</p>
			</div>
			<Card className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
				<CardHeader className="py-0">
					<CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" />App identity</CardTitle>
					<CardDescription>The icon is also used as the browser favicon.</CardDescription>
				</CardHeader>
				<CardContent className="pt-6">
					<form onSubmit={submit} className="space-y-6">
						<div className="space-y-2">
							<Label htmlFor="appName">App name</Label>
							<Input id="appName" value={appName} maxLength={60} onChange={(event) => setAppName(event.target.value)} required />
						</div>
						<div className="space-y-2">
							<Label>App icon</Label>
							<Input ref={inputRef} type="file" accept={BRANDING_ICON_ACCEPT} className="hidden" onChange={(event) => pickIcon(event.target.files?.[0] ?? null)} />
							<button type="button" onClick={() => inputRef.current?.click()} className="flex items-center gap-4 rounded-2xl border border-dashed border-[var(--border)] p-4 text-left hover:bg-[var(--muted)]">
								<img src={preview ?? branding.iconUrl} alt="App icon preview" className="h-16 w-16 rounded-2xl object-cover" />
								<span className="text-sm text-[var(--muted-foreground)]"><ImagePlus className="mb-1 h-5 w-5" />Choose PNG, JPEG, WebP, or GIF<br /><span className="text-xs text-[var(--muted-foreground)]">Maximum 2 MB</span></span>
							</button>
						</div>
						{status && <p className="text-sm text-[var(--muted-foreground)]">{status}</p>}
						<Button type="submit" disabled={saving || !appName.trim()}>{saving ? "Saving..." : "Save branding"}</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
