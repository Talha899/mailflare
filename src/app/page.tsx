import type { Metadata } from "next";
import Link from "next/link";
import { heroMessages, sidebarItems } from "./utils";
import { Inbox, Mail, Search, ShieldCheck } from "lucide-react";
import { getHomeBranding } from "./home-server-utils";
import { HomeAuthProvider } from "./home-auth";
import { HomeHeaderActions } from "./home-header-actions";
import { HomeHeroActions } from "./home-hero-actions";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
	const branding = await getHomeBranding();
	return {
		title: branding.appName,
		icons: { icon: branding.hasCustomIcon ? "/api/branding/icon" : "/logo.svg" },
	};
}

export default async function HomePage() {
	const branding = await getHomeBranding();

	return (
		<HomeAuthProvider>
		<div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
			<header className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
				<Link
					href="/"
					className="flex items-center gap-3"
					aria-label={`${branding.appName} home`}
				>
					<img src={branding.hasCustomIcon ? "/api/branding/icon" : "/logo.svg"} height={32} width={32} alt="" />
					<span className="text-base font-semibold tracking-tight">
						{branding.appName}
					</span>
				</Link>

				{/* <nav className="hidden items-center gap-6 text-sm font-medium text-[var(--muted-foreground)] md:flex">
					{landingNavItems.map((item) => (
						<a key={item.href} href={item.href} className="transition-colors hover:text-[var(--foreground)]">
							{item.label}
						</a>
					))}
				</nav> */}

				<div className="flex items-center gap-2">
					<HomeHeaderActions />
				</div>
			</header>

			<main>
				<section className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 pb-12 pt-8 sm:px-6 md:pt-16 lg:grid-cols-[0.86fr_1.14fr] lg:px-8">
					<div className="flex max-w-2xl flex-col justify-center">
						<div className="mb-6 flex w-fit items-center gap-2 text-sm font-medium text-[var(--compose)]">
							<ShieldCheck className="h-4 w-4" />
							Cloudflare-native email operations
						</div>
						<h1 className="max-w-[12ch] text-5xl font-semibold leading-[0.96] tracking-tight text-[var(--foreground)] sm:text-6xl lg:text-7xl">
							Mailboxes that feel like your inbox.
						</h1>
						<p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted-foreground)]">
							Add domains, route inbound mail, send through API keys, and manage
							your mailboxes from one quiet workspace built around the message list.
						</p>
						<HomeHeroActions />
					</div>

					<div className="relative min-h-[520px] overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)] shadow-[0_24px_70px_-45px_color-mix(in_oklab,var(--foreground)_35%,transparent)]">
						<div className="grid h-full min-h-[520px] grid-cols-[176px_1fr] bg-[var(--card)]">
							<aside className="hidden flex-col gap-2 bg-[var(--background)] px-3 py-5 sm:flex">
								<div className="mb-4 flex items-center gap-3 px-3 text-[var(--foreground)]/80">
									<Inbox className="h-5 w-5" />
									<span className="font-semibold">Mail</span>
								</div>
								<div className="mb-3 flex h-12 w-fit items-center gap-2 rounded-2xl bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--foreground)] shadow-sm">
									<Mail className="h-4 w-4" />
									Compose
								</div>
								{sidebarItems.map((item) => {
									const Icon = item.icon;
									return (
										<div
											key={item.label}
											className={`flex h-9 items-center justify-between rounded-r-lg px-3 text-sm font-medium ${
												item.active
													? "bg-[var(--accent)] text-[var(--foreground)]"
													: "text-[var(--muted-foreground)]"
											}`}
										>
											<span className="flex items-center gap-3">
												<Icon className="h-4 w-4" />
												{item.label}
											</span>
											{item.count && (
												<span className="text-xs text-[var(--compose)]">
													{item.count}
												</span>
											)}
										</div>
									);
								})}
							</aside>

							<div className="col-span-2 flex min-w-0 flex-col sm:col-span-1">
								<div className="flex h-16 items-center gap-3 bg-[var(--background)] px-4">
									<div className="flex h-12 flex-1 items-center gap-3 rounded-lg bg-[var(--accent)] px-4 text-[var(--muted-foreground)]">
										<Search className="h-5 w-5" />
										<span className="text-[15px]">Search mail</span>
									</div>
									<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)]">
										<Mail className="h-4 w-4" />
									</div>
								</div>

								<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-tl-3xl bg-[var(--card)]">
									<div className="flex h-14 items-center justify-between border-b border-[var(--border)] px-6">
										<div className="flex items-center gap-3">
											<h2 className="text-xl font-medium text-[var(--foreground)]">
												Priority inbox
											</h2>
											<span className="rounded-lg bg-[var(--muted)] px-2.5 py-1 text-xs font-medium text-[var(--muted-foreground)]">
												18
											</span>
										</div>
										<span className="hidden text-sm font-medium text-[var(--muted-foreground)] md:inline">
											Updated 2 min ago
										</span>
									</div>
									<div className="divide-y divide-[var(--border)]">
										{heroMessages.map((message) => (
											<div
												key={message.sender}
												className="grid min-h-14 grid-cols-[28px_minmax(112px,180px)_1fr_auto] items-center gap-3 px-5 text-sm hover:bg-[var(--muted)]"
											>
												<message.icon className="h-4 w-4 text-[var(--muted-foreground)]" />
												<span className="truncate font-semibold text-[var(--foreground)]">
													{message.sender}
												</span>
												<span className="truncate text-[var(--muted-foreground)]">
													<span className="font-medium text-[var(--foreground)]">
														{message.subject}
													</span>
													<span className="hidden text-[var(--muted-foreground)] md:inline">
														{" "}
														- {message.preview}
													</span>
												</span>
												<span className="rounded-lg bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-[var(--compose)]">
													{message.badge}
												</span>
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* <section id="workflow" className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
					<div id="api" className="rounded-[1.75rem] bg-[var(--card)] p-6 shadow-sm shadow-[color-mix(in_oklab,var(--foreground)_8%,transparent)]">
						<div className="mb-6 flex items-center justify-between gap-4">
							<div>
								<p className="text-sm font-semibold text-[var(--compose)]">Operational view</p>
								<h2 className="mt-1 text-2xl font-semibold tracking-tight">From DNS to delivery in one place.</h2>
							</div>
							<Clock3 className="hidden h-6 w-6 text-[var(--muted-foreground)] sm:block" />
						</div>
						<div className="grid gap-4 sm:grid-cols-3">
							{inboxStats.map((stat) => (
								<div key={stat.label} className="border-t border-[var(--border)] pt-4">
									<p className="no-font-mono text-2xl font-semibold text-[var(--foreground)]">{stat.value}</p>
									<p className="mt-1 text-sm text-[var(--muted-foreground)]">{stat.label}</p>
								</div>
							))}
						</div>
					</div>

					<div id="domains" className="rounded-[1.75rem] bg-[var(--card)] p-6 shadow-sm shadow-[color-mix(in_oklab,var(--foreground)_8%,transparent)]">
						<p className="text-sm font-semibold text-[var(--compose)]">Delivery signals</p>
						<div className="mt-5 space-y-4">
							{deliverySignals.map((signal) => (
								<div key={signal} className="flex items-center gap-3 text-sm font-medium text-[var(--foreground)]/80">
									<CheckCircle2 className="h-5 w-5 text-[var(--compose)]" />
									<span>{signal}</span>
								</div>
							))}
						</div>
					</div>
				</section> */}
			</main>
		</div>
		</HomeAuthProvider>
	);
}
