import Link from "next/link";
import { Inbox, Mail, Search, ShieldCheck } from "lucide-react";
import { HomeHeroActions } from "@/app/home-hero-actions";
import { getHomeBranding } from "@/app/home-server-utils";
import { heroMessages, sidebarItems } from "@/app/utils";
import { listBlogPosts } from "@/lib/blog/posts";

export default async function HomePage() {
	const branding = await getHomeBranding();
	const latest = listBlogPosts().slice(0, 3);

	return (
		<>
			<section className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 pb-12 pt-8 sm:px-6 md:pt-16 lg:grid-cols-[0.86fr_1.14fr] lg:px-8">
				<div className="flex max-w-2xl flex-col justify-center">
					<p className="mb-6 flex w-fit items-center gap-2 text-sm font-medium text-[var(--compose)]">
						<ShieldCheck className="h-4 w-4" />
						Email on a domain you already own
					</p>
					<h1 className="max-w-[13ch] text-4xl font-semibold leading-[0.96] tracking-tight text-[var(--foreground)] sm:text-6xl lg:text-7xl">
						Mailboxes that feel like your inbox.
					</h1>
					<p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted-foreground)]">
						Add a hostname, publish MX at your DNS host, and send through SMTP on this machine. {branding.appName} is
						the workspace around that mail — not a rented Gmail address.
					</p>
					<HomeHeroActions />
				</div>

				<div className="relative min-h-[420px] overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)] shadow-[0_24px_70px_-45px_color-mix(in_oklab,var(--foreground)_35%,transparent)] sm:min-h-[520px]">
					<div className="grid h-full min-h-[420px] grid-cols-[176px_1fr] bg-[var(--card)] sm:min-h-[520px]">
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
											item.active ? "bg-[var(--accent)] text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
										}`}
									>
										<span className="flex items-center gap-3">
											<Icon className="h-4 w-4" />
											{item.label}
										</span>
										{item.count && <span className="text-xs text-[var(--compose)]">{item.count}</span>}
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
							</div>
							<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-tl-3xl bg-[var(--card)]">
								<div className="flex h-14 items-center justify-between border-b border-[var(--border)] px-6">
									<h2 className="text-xl font-medium text-[var(--foreground)]">Inbox</h2>
								</div>
								<div className="divide-y divide-[var(--border)]">
									{heroMessages.map((message) => (
										<div
											key={message.sender}
											className="grid min-h-14 grid-cols-[28px_minmax(96px,1fr)] items-center gap-3 px-5 text-sm sm:grid-cols-[28px_minmax(112px,180px)_1fr_auto]"
										>
											<message.icon className="h-4 w-4 text-[var(--muted-foreground)]" />
											<span className="truncate font-semibold text-[var(--foreground)]">{message.sender}</span>
											<span className="col-span-2 truncate text-[var(--muted-foreground)] sm:col-span-1">
												<span className="font-medium text-[var(--foreground)]">{message.subject}</span>
												<span className="hidden md:inline"> — {message.preview}</span>
											</span>
											<span className="hidden rounded-lg bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-[var(--compose)] sm:inline">
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

			<section className="border-t border-[var(--border)] bg-[var(--card)]">
				<div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-3 lg:px-8">
					{[
						{ title: "Your DNS panel", body: "MX, SPF, and DKIM are a checklist you paste at Hostinger, Cloudflare DNS, or anywhere else. Dispatch does not take over the zone." },
						{ title: "Routing that respects mailboxes", body: "Reject, then exact addresses, then catch-all. A * rule cannot hide info@." },
						{ title: "SMTP you already run", body: "Outbound goes through Postfix on the Coolify host. DKIM is minted per domain. No cloud sending quota." },
					].map((item) => (
						<div key={item.title} className="min-w-0">
							<h2 className="text-lg font-semibold tracking-tight">{item.title}</h2>
							<p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{item.body}</p>
						</div>
					))}
				</div>
			</section>

			<section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
				<div className="flex items-end justify-between gap-4">
					<div>
						<h2 className="text-2xl font-semibold tracking-tight">From the blog</h2>
						<p className="mt-1 text-sm text-[var(--muted-foreground)]">DNS, routing, and running mail on this host.</p>
					</div>
					<Link href="/blog" className="text-sm font-medium text-[var(--compose)] hover:underline">
						All posts
					</Link>
				</div>
				<ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{latest.map((post) => (
						<li key={post.slug}>
							<Link href={`/blog/${post.slug}`} className="group block overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
								<img src={post.cover} alt={post.title} className="aspect-[1200/630] w-full object-cover" />
								<div className="space-y-2 p-5">
									<p className="text-xs text-[var(--muted-foreground)]">{post.category}</p>
									<h3 className="text-base font-semibold tracking-tight group-hover:underline">{post.title}</h3>
									<p className="text-sm leading-6 text-[var(--muted-foreground)]">{post.excerpt}</p>
								</div>
							</Link>
						</li>
					))}
				</ul>
			</section>
		</>
	);
}
