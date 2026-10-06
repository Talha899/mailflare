"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHomeAuth } from "./home-auth";

export function HomeHeroActions() {
	const hasUser = !!useHomeAuth();
	const [saasMode, setSaasMode] = useState(false);

	useEffect(() => {
		let cancelled = false;
		void fetch("/api/setup/status", { cache: "no-store" })
			.then((response) => (response.ok ? response.json() : null))
			.then((data) => {
				if (!cancelled) setSaasMode(!!(data as { saasMode?: boolean } | null)?.saasMode);
			})
			.catch(() => {
				if (!cancelled) setSaasMode(false);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const createHref = hasUser ? "/inbox" : saasMode ? "/admin/signup" : "/setup";

	return (
		<div className="mt-8 flex flex-col gap-3 sm:flex-row">
			<Button size="lg" asChild className="rounded-full px-6">
				<Link href={createHref}>
					{hasUser ? "Open dashboard" : "Create account"}
					<ArrowRight className="h-4 w-4" />
				</Link>
			</Button>
			<Button size="lg" variant="outline" asChild className="rounded-full border-[var(--border)] bg-[var(--card)] px-6">
				<Link href={hasUser ? "/inbox" : "/login"}>
					{hasUser ? "View inbox" : "Log in"}
				</Link>
			</Button>
		</div>
	);
}
