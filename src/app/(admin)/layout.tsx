"use client";

import { usePathname } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	// Sign-in and organization signup are public pages of the admin portal: no console chrome.
	if (pathname === "/admin/login" || pathname === "/admin/signup") {
		return <>{children}</>;
	}
	return <AdminShell>{children}</AdminShell>;
}
