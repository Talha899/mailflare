export function BookingListSkeleton() {
	return <div role="status" aria-label="Loading bookings" className="space-y-3">
		<span className="sr-only">Loading bookings…</span>
		{[0, 1, 2].map((item) => <div key={item} className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-5 motion-safe:animate-pulse">
			<div className="h-5 w-1/2 rounded-xl bg-[var(--muted)]" />
			<div className="mt-4 h-3 w-3/4 rounded-xl bg-[var(--muted)]" />
			<div className="mt-3 h-3 w-2/5 rounded-xl bg-[var(--muted)]" />
		</div>)}
	</div>;
}
