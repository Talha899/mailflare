"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authFetch, ensureClientSessionMarker, forgetClientSessionIfStale } from "@/lib/auth/client";
import type { AuthGuardProps } from "./auth-guard-types";
import { LoadingTransition } from "@/components/loading-transition";
import { saveUserTimeZonePreference } from "@/lib/time/client";

export function AuthGuard({ children, mode = "protected", requireMailbox, requireRole, requirePrimary }: AuthGuardProps) {
	const pathname = usePathname();
	const router = useRouter();
	const [authorized, setAuthorized] = useState(mode === "public");

	useEffect(() => {
		let cancelled = false;

		async function checkSession() {
			try {
				const cookieResponse = await fetch("/api/auth/me", {
					cache: "no-store",
					signal: AbortSignal.timeout(5_000),
				});
				const response = cookieResponse.ok || cookieResponse.status !== 401
					? cookieResponse
					: await authFetch("/api/auth/me", {
						redirectOnUnauthorized: false,
						signal: AbortSignal.timeout(5_000),
					});
				if (cancelled) return;

				if (!response.ok) {
					if (response.status === 401) forgetClientSessionIfStale();
					if (mode === "protected" && response.status === 401) {
						// Every admin console page lives under /admin; mail lives everywhere else.
						const adminArea = requireRole === "admin" || pathname === "/admin" || pathname.startsWith("/admin/");
						router.replace(adminArea ? "/admin/login" : "/login");
					} else setAuthorized(true);
					return;
				}

				const data = (await response.json()) as {
					hasMailboxes?: boolean;
					isSetup?: boolean;
					saasMode?: boolean;
					user?: { id?: string; role?: string; isPrimaryAdmin?: boolean; timeZone?: string | null };
				};
				if (data.user?.id) {
					saveUserTimeZonePreference(data.user.id, data.user.timeZone ?? null);
					ensureClientSessionMarker();
				}
				if (mode === "public") {
					// Keep portals separate: webmail public pages → inbox; admin login → admin console only for admins.
					// The admin portal's public pages: sign-in and organization signup.
					const onAdminLogin =
						pathname === "/admin/login" || pathname.startsWith("/admin/login/") || pathname === "/admin/signup";
					if (onAdminLogin) {
						// A webmail session is not an admin session, even for an admin's own
						// mailbox, so the admin sign-in form stays available to it.
						if (data.user?.role === "admin") router.replace("/admin");
						else setAuthorized(true);
					} else {
						router.replace("/inbox");
					}
					return;
				}

				const onboardingPath = data.saasMode ? "/onboarding/domain" : "/setup";
				const isAdmin = data.user?.role === "admin";
				const hasMailboxes = data.hasMailboxes === true;
				const isSetup = data.isSetup === true;
				const onSetupPath = pathname === "/setup" || pathname === "/onboarding/domain";
				const onAdminSetupPath =
					pathname === "/admin" ||
					pathname.startsWith("/admin/mailboxes") ||
					pathname.startsWith("/admin/domains") ||
					pathname.startsWith("/admin/accounts");
				const inAdminShell = requireRole === "admin";

				// No domain yet — keep admins in domain onboarding (SaaS) or setup.
				if (
					isAdmin &&
					!isSetup &&
					!onSetupPath &&
					(requireMailbox || data.hasMailboxes === false)
				) {
					router.replace(onboardingPath);
					return;
				}

				// Domain exists but no mailbox — only the admin console sends them to create one.
				// Webmail must never bridge into the admin console.
				if (
					inAdminShell &&
					isAdmin &&
					isSetup &&
					!hasMailboxes &&
					!onAdminSetupPath &&
					!onSetupPath
				) {
					router.replace("/admin/mailboxes");
					return;
				}

				if (onSetupPath && isSetup) {
					router.replace(hasMailboxes ? "/inbox" : inAdminShell ? "/admin/mailboxes" : "/inbox");
					return;
				}

				if (requireRole && data.user?.role !== requireRole) {
					// Same destination as the server gate: the console asks for an admin sign-in.
					router.replace(requireRole === "admin" ? "/admin/login" : "/inbox");
					return;
				}

				if (requirePrimary && !data.user?.isPrimaryAdmin) {
					router.replace(inAdminShell ? "/admin" : "/inbox");
					return;
				}

				setAuthorized(true);
			} catch {
				if (!cancelled) setAuthorized(true);
			}
		}

		void checkSession();

		return () => {
			cancelled = true;
		};
	}, [mode, pathname, requireMailbox, requireRole, requirePrimary, router]);

	useEffect(() => {
		const refreshTimeZone = (event: StorageEvent) => {
			if (event.key === "mailflare-user-time-zone") window.location.reload();
		};
		window.addEventListener("storage", refreshTimeZone);
		return () => window.removeEventListener("storage", refreshTimeZone);
	}, []);

	if (mode === "public") return <>{children}</>;
	return <LoadingTransition ready={authorized}>{children}</LoadingTransition>;
}
