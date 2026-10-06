export function BookingDetailSkeleton() {
	return <div role="status" aria-label="Loading availability" className="grid overflow-hidden rounded-t-3xl bg-[var(--card)] shadow-xl shadow-[color-mix(in_oklab,var(--foreground)_10%,transparent)] motion-safe:animate-pulse lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(240px,.95fr)_minmax(380px,1.65fr)_minmax(240px,.95fr)]">
		<span className="sr-only">Loading availability…</span>
		<div className="space-y-6 border-b border-[var(--border)] p-7 sm:p-9 lg:border-b-0 lg:border-r">
			<div className="h-6 w-2/3 rounded-xl bg-[var(--muted)]" />
			<div className="h-4 w-full rounded-xl bg-[var(--muted)]" />
			<div className="h-4 w-4/5 rounded-xl bg-[var(--muted)]" />
			<div className="mt-10 h-4 w-1/3 rounded-xl bg-[var(--muted)]" />
		</div>
		<div className="border-b border-[var(--border)] p-7 sm:p-9 lg:border-b-0 lg:border-r">
			<div className="h-6 w-1/2 rounded-xl bg-[var(--muted)]" />
			<div className="mx-auto mt-10 grid max-w-[440px] grid-cols-7 gap-2">
				{Array.from({ length: 35 }, (_, index) => <div key={index} className="aspect-square rounded-xl bg-[var(--muted)]" />)}
			</div>
		</div>
		<div className="space-y-3 p-7 sm:p-9">
			<div className="mb-6 h-6 w-3/4 rounded-xl bg-[var(--muted)]" />
			{[0, 1, 2, 3, 4].map((item) => <div key={item} className="h-11 rounded-xl bg-[var(--muted)]" />)}
		</div>
	</div>;
}
