"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Clock3, MapPin } from "lucide-react";
import { useBranding } from "@/components/branding-provider";
import { RouteLoadingBar } from "@/components/route-loading-bar";
import type { PublicBookingEvent } from "./types";
import { BookingListSkeleton } from "./booking-list-skeleton";

export default function PublicBookingListPage() {
	const branding = useBranding();
	const params = useParams();
	const userId = typeof params.userId === "string" ? params.userId : undefined;
	const username = typeof params.username === "string" ? params.username : undefined;
	const query = username ? `username=${encodeURIComponent(username)}` : `userId=${encodeURIComponent(userId ?? "")}`;
	const [name, setName] = useState("");
	const [events, setEvents] = useState<PublicBookingEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	useEffect(() => {
		let active = true;
		void fetch(`/api/public/booking?${query}`).then(async (response) => {
			if (!response.ok) throw new Error();
			return response.json() as Promise<{ name: string; events: PublicBookingEvent[] }>;
		}).then((data) => { if (active) { setName(data.name); setEvents(data.events); } }).catch(() => { if (active) setError("This booking page is unavailable."); }).finally(() => { if (active) setLoading(false); });
		return () => { active = false; };
	}, [query]);
	return <main className="page-transition-enter flex min-h-dvh flex-col bg-[var(--background)] p-4 lg:pt-12 text-[var(--foreground)]">
		{loading && <RouteLoadingBar />}
		<div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
			<div className="mb-7"><h1 className="text-3xl font-semibold">Book a meeting{name ? ` with ${name}` : ""}</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Choose a meeting to see available times.</p></div>
			{loading ? <BookingListSkeleton /> : error ? <p className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-[var(--muted-foreground)] shadow-sm">{error}</p> : events.length === 0 ? <p className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-[var(--muted-foreground)]">No meetings are available to book right now.</p> : <div className="page-transition-enter space-y-3">{events.map((event) => <Link key={event.id} href={username ? `/c/${username}/${event.slug}` : `/book/${userId}/${event.id}`} className="group flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 transition-colors hover:bg-[var(--muted)] active:scale-[0.98]"><div className="min-w-0 flex-1"><h2 className="font-semibold text-[var(--foreground)] group-hover:text-[var(--compose)]">{event.name}</h2>{event.description && <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-[var(--muted-foreground)]">{event.description}</p>}<p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted-foreground)]"><span className="inline-flex items-center gap-1"><Clock3 className="h-4 w-4" />{event.durationMinutes} minutes</span>{event.location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{event.location}</span>}</p></div><ArrowRight className="h-5 w-5 text-[var(--muted-foreground)] group-hover:text-[var(--compose)]" /></Link>)}</div>}
			<div className="mt-auto flex min-w-0 items-center gap-3 pt-10 text-[var(--muted-foreground)]">
				<img src={branding.iconUrl} width={24} height={24} alt={branding.appName || "Dispatch"} />
				<span className="truncate font-semibold">{branding.appName}</span>
			</div>
		</div>
	</main>;
}
