"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchMailboxForwarding, updateMailboxForwarding } from "./utils";

export default function MailboxForwardingForm({ mailboxId }: { mailboxId: string }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<string | null>(null);

  const forwarding = useQuery({
    queryKey: ["mailbox", mailboxId, "forwarding"],
    queryFn: () => fetchMailboxForwarding(mailboxId),
    enabled: !!mailboxId,
  });

  const saved = forwarding.data ?? "";
  const forwardingEmail = draft ?? saved;

  const save = useMutation({
    mutationFn: (value: string) => updateMailboxForwarding(mailboxId, value),
    onSuccess: async (next) => {
      setDraft(null);
      qc.setQueryData(["mailbox", mailboxId, "forwarding"], next);
    },
  });

  return (
    <Card className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
      <CardHeader className="py-0">
        <CardTitle>Forward copies</CardTitle>
        <CardDescription>
          When a message is delivered to this inbox, a copy is also sent to this address.
          Mailbox users never see this setting.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        {forwarding.isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <div className="space-y-2">
            <Label htmlFor="forwardingEmail">Forward to</Label>
            <Input
              id="forwardingEmail"
              type="email"
              value={forwardingEmail}
              onChange={(event) => {
                setDraft(event.target.value);
                save.reset();
              }}
              placeholder="archive@example.com"
              autoComplete="off"
              disabled={save.isPending}
            />
            <p className="text-sm text-[var(--muted-foreground)]">
              Leave this blank to stop sending copies. The message still stays in this inbox.
              On Cloudflare Email Routing, the address must already be a verified destination.
            </p>
          </div>
        )}
        {forwarding.isError && (
          <p className="text-sm text-[var(--destructive)]">
            {forwarding.error instanceof Error ? forwarding.error.message : "Failed to load forwarding"}
          </p>
        )}
        {save.isError && (
          <p className="text-sm text-[var(--destructive)]">
            {save.error instanceof Error ? save.error.message : "Failed to update forwarding"}
          </p>
        )}
        {save.isSuccess && <p className="text-sm text-[var(--success)]">Forwarding saved</p>}
        <Button
          type="button"
          onClick={() => save.mutate(forwardingEmail.trim())}
          disabled={forwarding.isLoading || save.isPending || forwardingEmail.trim() === saved}
        >
          {save.isPending ? "Saving..." : "Save forwarding"}
        </Button>
      </CardContent>
    </Card>
  );
}
