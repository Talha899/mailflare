"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2 } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { persistAuthSession } from "@/lib/auth/client";

export function SignupClient() {
	const router = useRouter();
	const [organizationName, setOrganizationName] = useState("");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function onSubmit(event: React.FormEvent) {
		event.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const response = await fetch("/api/auth/signup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ organizationName, name, email, password }),
			});
			const data = (await persistAuthSession(response)) as {
				error?: string;
				redirect?: string;
			};
			if (!response.ok) {
				setError(typeof data.error === "string" ? data.error : "Signup failed");
				return;
			}
			router.replace(data.redirect ?? "/onboarding/domain");
			router.refresh();
		} catch {
			setError("Signup failed. Please try again.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<AuthShell
			icon={Building2}
			title="Create your workspace"
			description="Sign up to connect your domain and create mailboxes for your team."
			footer={
				<p className="text-sm text-[var(--muted-foreground)]">
					Already have an account?{" "}
					<Link href="/login" className="font-medium text-[var(--foreground)] underline">
						Sign in
					</Link>
				</p>
			}
		>
			<form className="space-y-4" onSubmit={onSubmit}>
				<div className="space-y-2">
					<Label htmlFor="organizationName">Organization name</Label>
					<Input
						id="organizationName"
						value={organizationName}
						onChange={(event) => setOrganizationName(event.target.value)}
						placeholder="Acme Inc"
						required
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="name">Your name</Label>
					<Input
						id="name"
						value={name}
						onChange={(event) => setName(event.target.value)}
						placeholder="Jane Doe"
						required
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="email">Work email</Label>
					<Input
						id="email"
						type="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						placeholder="jane@example.com"
						autoComplete="email"
						required
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="password">Password</Label>
					<Input
						id="password"
						type="password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						minLength={8}
						autoComplete="new-password"
						required
					/>
				</div>
				{error && (
					<p className="rounded-xl border border-[var(--destructive)]/25 bg-[var(--destructive)]/10 px-3 py-2.5 text-sm font-medium text-[var(--destructive)]">
						{error}
					</p>
				)}
				<Button type="submit" className="h-10 w-full rounded-xl active:scale-[0.98]" disabled={loading}>
					{loading ? "Creating workspace..." : "Create workspace"}
				</Button>
			</form>
		</AuthShell>
	);
}
