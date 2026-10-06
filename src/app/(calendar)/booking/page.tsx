"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { CalendarDays, Check, Clock3, Copy, ExternalLink, MapPin, MoreHorizontal, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { RouteLoadingBar } from "@/components/route-loading-bar";
import { authFetch } from "@/lib/auth/client";
import { getUserTimeZone } from "@/lib/time/utils";
import { useSidebar } from "@/components/sidebar-state";
import { UpcomingSidebar } from "../upcoming-sidebar";
import { BookingEditor } from "./booking-editor";
import { BookingListSkeleton } from "./booking-list-skeleton";
import { visibleBookingEvents } from "./default-events";
import type { BookingEvent, BookingForm, BookingHost } from "./types";
import { availabilityLabel, durationLabel, emptyBookingForm, formFromEvent } from "./utils";
import { useConfirm } from "@/components/ui/confirm-dialog";

export default function BookingsPage() {
	const confirm = useConfirm();
	const { minimal } = useSidebar();
	const [events, setEvents] = useState<BookingEvent[]>([]);
	const [username, setUsername] = useState("");
	const [hosts, setHosts] = useState<BookingHost[]>([]);
	const [canManageHosts, setCanManageHosts] = useState(false);
	const [currentUserId, setCurrentUserId] = useState("");
	const [loading, setLoading] = useState(true);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState<BookingForm | null>(null);
	const [panelOpen, setPanelOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [menuId, setMenuId] = useState<string | null>(null);
	const [savingTemplateId, setSavingTemplateId] = useState<string | null>(null);
	const listEvents = visibleBookingEvents(events, currentUserId, getUserTimeZone());

	useEffect(() => {
		let active = true;
		void authFetch("/api/booking").then(async (response) => {
			if (!response.ok) throw new Error();
			return response.json() as Promise<{ events: BookingEvent[]; username: string | null; currentUser: BookingHost; canManageHosts: boolean }>;
		}).then(async (data) => {
			if (active) { setEvents(data.events); setUsername(data.username ?? ""); setHosts([data.currentUser]); setCurrentUserId(data.currentUser.id); }
			if (!data.canManageHosts) return;
			const response = await authFetch("/api/accounts");
			if (!response.ok) { if (active) toast.error("Could not load the user list."); return; }
			const accounts = await response.json() as { accounts: (BookingHost & { disabled: boolean })[] };
			if (active) { setHosts([data.currentUser, ...accounts.accounts.filter((account) => !account.disabled && account.id !== data.currentUser.id).map(({ id, name, email, hasAvatar }) => ({ id, name, email, hasAvatar }))]); setCanManageHosts(true); }
		})
			.catch(() => { if (active) toast.error("Could not load bookings."); })
			.finally(() => { if (active) setLoading(false); });
		return () => { active = false; };
	}, []);

	useEffect(() => {
		if (panelOpen || !form) return;
		const timeout = window.setTimeout(() => { setForm(null); setEditingId(null); }, 320);
		return () => window.clearTimeout(timeout);
	}, [panelOpen, form]);

	function revealPanel() { setPanelOpen(false); requestAnimationFrame(() => requestAnimationFrame(() => setPanelOpen(true))); }
	function startCreate() { if (!currentUserId) return; setEditingId(null); setForm(emptyBookingForm(getUserTimeZone(), currentUserId)); setMenuId(null); revealPanel(); }
	function startEdit(event: BookingEvent) { setEditingId(event.isTemplate ? null : event.id); setForm({ ...formFromEvent(event), enabled: event.isTemplate ? true : event.enabled }); setMenuId(null); if (!panelOpen) revealPanel(); }
	function closeEditor() { setPanelOpen(false); }

	async function save() {
		if (!form) return;
		setSaving(true);
		try {
			const response = await authFetch(editingId ? `/api/booking/${editingId}` : "/api/booking", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
			const data = await response.json() as { event?: BookingEvent; error?: string };
			if (!response.ok || !data.event) { toast.error(data.error ?? "Could not save booking event."); return; }
			setEvents((current) => editingId ? current.map((item) => item.id === editingId ? data.event! : item) : [...current, data.event!]);
			closeEditor();
			toast.success(editingId ? "Booking event saved." : "Booking event created.");
		} catch { toast.error("Could not save booking event."); }
		finally { setSaving(false); }
	}

	async function setEnabled(event: BookingEvent, enabled: boolean) {
		if (event.isTemplate && !enabled) return;
		if (event.isTemplate) setSavingTemplateId(event.id);
		try {
			const response = await authFetch(event.isTemplate ? "/api/booking" : `/api/booking/${event.id}`, { method: event.isTemplate ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...formFromEvent(event), enabled }) });
			const data = await response.json() as { event?: BookingEvent; error?: string };
			if (!response.ok || !data.event) throw new Error(data.error);
			setEvents((current) => event.isTemplate ? [...current, data.event!] : current.map((item) => item.id === event.id ? data.event! : item));
			if (editingId === event.id && form) setForm({ ...form, enabled });
			setMenuId(null);
		} catch { toast.error(event.isTemplate ? "Could not enable booking event." : "Could not update booking event."); }
		finally { if (event.isTemplate) setSavingTemplateId(null); }
	}

	async function remove(event: BookingEvent) {
		if (!(await confirm({ title: `Delete “${event.name}”?`, description: "Its booking link stops working. Existing bookings stay on your calendar.", confirmLabel: "Delete event" }))) return;
		try {
			const response = await authFetch(`/api/booking/${event.id}`, { method: "DELETE" });
			if (!response.ok) throw new Error();
			setEvents((current) => current.filter((item) => item.id !== event.id));
			if (editingId === event.id) closeEditor();
			setMenuId(null);
		} catch { toast.error("Could not delete booking event."); }
	}

	async function copyLink(event: BookingEvent) {
		if (!username) { toast.error("Booking username is unavailable."); return; }
		try { await navigator.clipboard.writeText(`${window.location.origin}/c/${username}/${event.slug}`); toast.success("Booking link copied."); }
		catch { toast.error("Could not copy booking link."); }
	}

	return <div className={clsx("flex h-full min-h-0 flex-col bg-[var(--background)] pl-3 transition-[gap] duration-200 ease-in-out motion-reduce:transition-none lg:flex-row", minimal ? "gap-0" : "gap-3")}>
		{loading && <RouteLoadingBar />}
		<UpcomingSidebar />
		<section className="min-h-0 min-w-0 flex-1 overflow-hidden overscroll-contain">
			<div className="flex h-full min-h-0 min-w-0">
				<div className="min-w-0 flex-1 overflow-y-auto overscroll-contain scrollbar-gutter-stable">
					<div className="mx-auto max-w-6xl px-5 md:px-8">
						<section aria-label="Booking events" className="space-y-1 pt-3">

							<div className="flex flex-wrap items-start justify-between gap-4 pb-6">
								<div><h1 className="text-3xl font-semibold text-[var(--foreground)]">Bookings</h1><p className="mt-1 text-sm text-[var(--muted-foreground)]">Set the meetings people can book with you.</p></div>
								<div className="flex items-center gap-2">

									<Button variant="ghost" className="w-10">
										<Link href={`/c/${username}`} target="_blank" className="text-[var(--primary)] underline underline-offset-2">
											<ExternalLink size={18} />
										</Link>
									</Button>

									<Button type="button" onClick={startCreate} disabled={!currentUserId} className="rounded-xl"><Plus size={18} />New event</Button></div>
							</div>

							{loading ? <BookingListSkeleton /> : listEvents.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-12 text-center"><CalendarDays className="mx-auto mb-3 h-8 w-8 text-[var(--muted-foreground)]" /><h2 className="font-medium text-[var(--foreground)]">No booking events yet</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Create an event to share your availability.</p></div> : listEvents.map((event, i) => <article key={event.id} className={clsx(!event.enabled && "opacity-65", "relative flex flex-wrap items-center gap-4 rounded-xl bg-[var(--card)] px-5 py-5 transition-colors hover:bg-[color-mix(in_oklab,var(--muted)_45%,var(--card))]", i === 0 && "rounded-t-3xl")}>
								<div className="flex min-w-0 flex-1 items-start gap-4"><span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-xl border ${event.enabled ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]" : "border-[var(--border)] bg-[var(--card)]"}`}>{event.enabled && <Check className="h-3.5 w-3.5" />}</span><div className="min-w-0"><button type="button" onClick={() => startEdit(event)} className="text-left text-lg font-semibold text-[var(--foreground)] hover:text-[var(--primary)]">{event.name}</button>{event.description && <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-[var(--muted-foreground)]">{event.description}</p>}<p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--muted-foreground)]"><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{durationLabel(event.durationMinutes)}</span><span>·</span><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.location || "No location set"}</span></p><p className="mt-2 text-sm text-[var(--muted-foreground)]">{availabilityLabel(event)}</p></div></div>
								<div className="ml-auto flex items-center gap-2">{event.enabled ? <><Button type="button" variant="outline" onClick={() => void copyLink(event)} className="h-9 rounded-xl px-3"><Copy className="h-4 w-4" />Copy link</Button>{username && <Link href={`/c/${username}/${event.slug}`} target="_blank" aria-label={`Open booking page for ${event.name}`} className="rounded-xl p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><ExternalLink className="h-4 w-4" /></Link>}</> : <Button type="button" variant="outline" disabled={event.isTemplate && savingTemplateId !== null} onClick={() => void setEnabled(event, true)} className="h-9 rounded-xl px-3">{savingTemplateId === event.id ? "Turning on…" : "Turn on"}</Button>}
									{!event.isTemplate && <div className="relative"><button type="button" aria-label={`More options for ${event.name}`} aria-expanded={menuId === event.id} onClick={() => setMenuId(menuId === event.id ? null : event.id)} className="rounded-xl p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)]"><MoreHorizontal className="h-5 w-5" /></button>{menuId === event.id && <div className="absolute right-0 top-10 z-10 w-36 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-lg"><button type="button" onClick={() => startEdit(event)} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-[var(--muted)]">Edit</button><button type="button" onClick={() => void setEnabled(event, !event.enabled)} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-[var(--muted)]">Turn {event.enabled ? "off" : "on"}</button><button type="button" onClick={() => void remove(event)} className="block w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--destructive)] hover:bg-[color-mix(in_oklab,var(--destructive)_12%,var(--card))]">Delete</button></div>}</div>}</div>
							</article>)}
						</section>
					</div>
				</div>
				{form && <BookingEditor form={form} open={panelOpen} editingId={editingId} username={username} hosts={hosts} canManageHosts={canManageHosts} currentUserId={currentUserId} saving={saving} onChange={setForm} onClose={closeEditor} onSave={() => void save()} onDelete={() => { const event = events.find((item) => item.id === editingId); if (event) void remove(event); }} onToggleEnabled={() => { const event = events.find((item) => item.id === editingId); if (event) void setEnabled(event, !event.enabled); }} onClosed={() => { if (!panelOpen) { setForm(null); setEditingId(null); } }} />}
			</div>
		</section>
	</div>;
}
