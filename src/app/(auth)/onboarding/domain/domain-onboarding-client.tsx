"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Globe2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authFetch } from "@/lib/auth/client";

type VerificationInfo = { type: string; name: string; content: string };

export function DomainOnboardingClient() {
	const router = useRouter();
	const [hostname, setHostname] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [verification, setVerification] = useState<VerificationInfo | null>(null);
	const [domainId, setDomainId] = useState<string | null>(null);
	const [verifying, setVerifying] = useState(false);

	async function addDomain(event: React.FormEvent) {
		event.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const response = await authFetch("/api/domains", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ hostname, enableRouting: true, enableSending: true }),
			});
			const data = (await response.json()) as {
				error?: string;
				domain?: { id: string };
				verification?: VerificationInfo;
			};
			if (!response.ok) {
				setError(data.error ?? "Failed to add domain");
				return;
			}
			setDomainId(data.domain?.id ?? null);
			if (data.verification) {
				setVerification(data.verification);
			} else {
				router.replace("/admin/mailboxes");
				router.refresh();
			}
		} catch {
			setError("Failed to add domain");
		} finally {
			setLoading(false);
		}
	}

	async function verifyDomain() {
		if (!domainId) return;
		setVerifying(true);
		setError(null);
		try {
			const response = await authFetch(`/api/domains/${domainId}/verify`, { method: "POST" });
			const data = (await response.json()) as { error?: string; verified?: boolean };
			if (!response.ok) {
				setError(data.error ?? "Verification failed");
				return;
			}
			if (!data.verified) {
				setError("TXT record not found yet. DNS can take a few minutes to propagate.");
				return;
			}
			router.replace("/admin/mailboxes");
			router.refresh();
		} catch {
			setError("Verification failed");
		} finally {
			setVerifying(false);
		}
	}

	return (
		<AuthShell
			icon={Globe2}
			title="Connect your domain"
			description="Add the domain you want to host email for. We will show the DNS records to publish."
		>
			{!verification ? (
				<form className="space-y-4" onSubmit={addDomain}>
					<div className="space-y-2">
						<Label htmlFor="hostname">Domain</Label>
						<Input
							id="hostname"
							value={hostname}
							onChange={(event) => setHostname(event.target.value)}
							placeholder="company.com"
							required
						/>
					</div>
					{error && <p className="text-sm text-red-600">{error}</p>}
					<div className="flex flex-col gap-2 sm:flex-row">
						<Button type="submit" disabled={loading} className="flex-1">
							{loading ? "Adding..." : "Add domain"}
						</Button>
						<Button type="button" variant="outline" onClick={() => router.replace("/inbox")}>
							Skip for now
						</Button>
					</div>
				</form>
			) : (
				<div className="space-y-4">
					<p className="text-sm text-neutral-700">
						Create this TXT record at your DNS provider to prove you own the domain, then verify.
					</p>
					<div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
						<p>
							<span className="font-medium">Type:</span> {verification.type}
						</p>
						<p className="break-all">
							<span className="font-medium">Name:</span> {verification.name}
						</p>
						<p className="break-all">
							<span className="font-medium">Value:</span> {verification.content}
						</p>
					</div>
					{error && <p className="text-sm text-red-600">{error}</p>}
					<div className="flex flex-col gap-2 sm:flex-row">
						<Button type="button" onClick={verifyDomain} disabled={verifying} className="flex-1">
							{verifying ? "Checking DNS..." : "Verify ownership"}
						</Button>
						<Button type="button" variant="outline" onClick={() => router.replace("/domains")}>
							Open domains
						</Button>
					</div>
				</div>
			)}
		</AuthShell>
	);
}
