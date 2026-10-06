import Link from "next/link";
import { marketingNav } from "@/lib/blog/nav";

export function MarketingFooter({ appName }: { appName: string }) {
	return (
		<footer className="border-t border-[var(--border)] bg-[var(--sidebar)]">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:px-8">
				<div className="max-w-sm">
					<p className="text-sm font-semibold tracking-tight">{appName}</p>
					<p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
						Private email for a domain you already own. MX you publish. SMTP you run.
					</p>
				</div>
				<nav className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm sm:grid-cols-3">
					{marketingNav.map((item) => (
						<Link key={item.href} href={item.href} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
							{item.label}
						</Link>
					))}
					<Link href="/privacy" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
						Privacy
					</Link>
					<Link href="/login" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
						Log in
					</Link>
				</nav>
			</div>
		</footer>
	);
}
