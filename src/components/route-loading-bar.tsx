export function RouteLoadingBar() {
	return (
		<div className="fixed inset-x-0 top-0 z-[120] h-1 overflow-hidden bg-[var(--muted)]" role="progressbar" aria-label="Loading page">
			<div className="route-loading-bar h-full w-2/5 bg-[var(--primary)]" />
		</div>
	);
}
