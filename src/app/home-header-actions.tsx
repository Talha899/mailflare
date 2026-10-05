"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getHomeActions } from "./utils";
import { HomeAccountMenu } from "./home-account-menu";
import { useHomeAuth } from "./home-auth";

export function HomeHeaderActions() {
	const user = useHomeAuth();
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

	if (user) return <HomeAccountMenu user={user} />;

	return (
		<>
			{getHomeActions(false, saasMode).map((action) => (
				<Button key={action.href} variant={action.variant} asChild>
					<Link href={action.href}>{action.label}</Link>
				</Button>
			))}
		</>
	);
}
