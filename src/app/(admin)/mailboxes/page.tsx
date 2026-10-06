"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { List, ListRow } from "@/components/ui/list";
import { SectionRowSkeleton } from "@/components/page-skeletons";
import { clearMailboxesCache } from "@/components/mailbox-provider-utils";
import { ProgressiveAvatarImage } from "@/components/progressive-avatar-image";
import { CreateMailboxWizard } from "@/components/admin/create-mailbox-wizard";
import { authFetch } from "@/lib/auth/client";
import type { Domain, MailboxesResponse } from "./types";
import { getMailboxAddress, getMailboxName } from "./utils";

export default function MailboxesPage() {
	const qc = useQueryClient();
	const [createOpen, setCreateOpen] = useState(false);
	const [autoOpenedCreate, setAutoOpenedCreate] = useState(false);

	const domains = useQuery({
		queryKey: ["domains"],
		queryFn: async () => {
			const res = await authFetch("/api/domains");
			return (await res.json()) as { domains: Domain[] };
		},
	});

	const mailboxes = useQuery({
		queryKey: ["mailboxes"],
		queryFn: async () => {
			const res = await authFetch("/api/mailboxes");
			return (await res.json()) as MailboxesResponse;
		},
	});

	useEffect(() => {
		if (autoOpenedCreate || mailboxes.isLoading || !mailboxes.data) return;
		if ((mailboxes.data.mailboxes?.length ?? 0) === 0) {
			setCreateOpen(true);
			setAutoOpenedCreate(true);
		}
	}, [autoOpenedCreate, mailboxes.data, mailboxes.isLoading]);

	const domainMap = new Map((domains.data?.domains ?? []).map((d) => [d.id, d.hostname]));

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Mailboxes</h1>
					<p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--muted-foreground)]">
						Create addresses with mailbox passwords for webmail, IMAP, and SMTP AUTH — separate from administrator
						account passwords.
					</p>
				</div>
				<Dialog open={createOpen} onOpenChange={setCreateOpen}>
					<DialogTrigger asChild>
						<Button>
							<Plus className="h-4 w-4" />
							New mailbox
						</Button>
					</DialogTrigger>
					<DialogContent className="max-h-[calc(100vh-4rem)] overflow-y-auto sm:max-w-lg">
						<DialogHeader>
							<DialogTitle>Create mailbox</DialogTitle>
							<DialogDescription>
								Sets a mailbox password for webmail, IMAP, and SMTP AUTH (not your admin sign-in). Connection
								settings are shown once after create.
							</DialogDescription>
						</DialogHeader>
						<CreateMailboxWizard
							domains={domains.data?.domains ?? []}
							onCreated={() => {
								clearMailboxesCache();
								qc.invalidateQueries({ queryKey: ["mailboxes"] });
								qc.invalidateQueries({ queryKey: ["accounts"] });
							}}
							onCancel={() => setCreateOpen(false)}
						/>
					</DialogContent>
				</Dialog>
			</div>
			<section className="space-y-3">
				{mailboxes.isLoading && <SectionRowSkeleton />}
				{!mailboxes.isLoading && (mailboxes.data?.mailboxes ?? []).length === 0 && (
					<p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-8 text-center text-sm text-[var(--muted-foreground)]">
						No mailboxes yet — create one to get started.
					</p>
				)}
				<List>
					{(mailboxes.data?.mailboxes ?? []).map((mailbox) => {
						const mailboxWithHostname = {
							...mailbox,
							hostname: mailbox.hostname ?? domainMap.get(mailbox.domainId) ?? "?",
						};
						return (
							<ListRow key={mailbox.id} asChild>
								<Link
									href={`/mailboxes/${mailbox.id}`}
									className="group px-5 py-4 transition-colors hover:bg-[var(--muted)]"
								>
									<span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--muted)] text-sm font-semibold text-[var(--compose)]">
										{getMailboxName(mailboxWithHostname).trim().charAt(0).toUpperCase() || "?"}
										{mailbox.hasAvatar && (
											<ProgressiveAvatarImage
												src={`/api/mailboxes/${mailbox.id}/avatar`}
												alt={`${getMailboxName(mailboxWithHostname)} profile`}
												className="absolute inset-0 h-full w-full object-cover"
											/>
										)}
									</span>
									<span className="min-w-0">
										<span className="flex min-w-0 items-center gap-2">
											<span className="block truncate text-sm font-semibold">
												{getMailboxName(mailboxWithHostname)}
											</span>
											{mailbox.type === "shared" && (
												<span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-medium text-[var(--compose)]">
													<UsersRound className="h-3 w-3" />
													Shared
												</span>
											)}
										</span>
										<span className="block truncate font-mono text-sm text-[var(--muted-foreground)]">
											{getMailboxAddress(mailboxWithHostname)}
										</span>
									</span>
								</Link>
							</ListRow>
						);
					})}
				</List>
			</section>
		</div>
	);
}
