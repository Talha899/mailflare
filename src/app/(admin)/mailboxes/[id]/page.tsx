"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AtSign, Save, Trash2, UserPlus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createMailboxAlias,
  deleteMailbox,
  deleteMailboxAlias,
  fetchMailbox,
  fetchMailboxAliases,
  fetchSharedInboxAccess,
  getMailboxAddress,
  grantSharedInboxAccess,
  revokeSharedInboxAccess,
  updateMailboxSettings,
} from "./utils";
import MailboxAvatarForm from "./MailboxAvatarForm";

export default function MailboxSettingsPage() {
  const params = useParams<{ id: string }>();
  const mailboxId = params.id;
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [useAllDomains, setUseAllDomains] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [aliasLocalPart, setAliasLocalPart] = useState("");
  const [aliasDomainId, setAliasDomainId] = useState("");

  const mailbox = useQuery({
    queryKey: ["mailbox", mailboxId],
    queryFn: () => fetchMailbox(mailboxId),
    enabled: !!mailboxId,
  });

  useEffect(() => {
    if (mailbox.data) {
      setDisplayName(mailbox.data.displayName ?? "");
      setUseAllDomains(mailbox.data.useAllDomains);
      setAliasDomainId((current) => current || mailbox.data.domainId);
    }
  }, [mailbox.data]);

  const updateName = useMutation({
    mutationFn: () => updateMailboxSettings(mailboxId, { displayName, useAllDomains }),
    onSuccess: (updatedMailbox) => {
      qc.setQueryData(["mailbox", mailboxId], updatedMailbox);
      qc.invalidateQueries({ queryKey: ["mailboxes"] });
    },
  });

  const router = useRouter();
  const removeMailbox = useMutation({
    mutationFn: () => deleteMailbox(mailboxId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["mailboxes"] });
      router.push("/mailboxes");
    },
  });

  const aliases = useQuery({
    queryKey: ["mailbox", mailboxId, "aliases"],
    queryFn: () => fetchMailboxAliases(mailboxId),
    enabled: !!mailboxId,
  });
  const addAlias = useMutation({
    mutationFn: () =>
      createMailboxAlias(mailboxId, {
        domainId: aliasDomainId,
        localPart: aliasLocalPart.trim(),
      }),
    onSuccess: async () => {
      setAliasLocalPart("");
      await qc.invalidateQueries({ queryKey: ["mailbox", mailboxId, "aliases"] });
    },
  });
  const removeAlias = useMutation({
    mutationFn: (aliasId: string) => deleteMailboxAlias(mailboxId, aliasId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mailbox", mailboxId, "aliases"] }),
  });

  const sharedAccess = useQuery({
    queryKey: ["mailbox", mailboxId, "access"],
    queryFn: () => fetchSharedInboxAccess(mailboxId),
    enabled: mailbox.data?.type === "shared",
  });
  const addMember = useMutation({
    mutationFn: () => grantSharedInboxAccess(mailboxId, selectedUserId),
    onSuccess: async () => {
      setSelectedUserId("");
      await qc.invalidateQueries({ queryKey: ["mailbox", mailboxId, "access"] });
    },
  });
  const removeMember = useMutation({
    mutationFn: (userId: string) => revokeSharedInboxAccess(mailboxId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mailbox", mailboxId, "access"] }),
  });

  const address = mailbox.data ? getMailboxAddress(mailbox.data) : "";
  const [credPassword, setCredPassword] = useState<string | null>(null);
  const [credError, setCredError] = useState<string | null>(null);
  const connection = useQuery({
    queryKey: ["mailbox", mailboxId, "connection"],
    queryFn: async () => {
      const { authFetch } = await import("@/lib/auth/client");
      const res = await authFetch(`/api/mailboxes/${mailboxId}/connection`);
      if (!res.ok) throw new Error("Failed to load connection info");
      return res.json() as Promise<{
        address: string;
        connection: {
          smtp: { host: string; port: number; encryption: string; configured: boolean };
          imap: { host: string; port: number; encryption: string; configured: boolean };
          username: string;
          note: string | null;
        };
      }>;
    },
    enabled: !!mailboxId,
  });
  const resetPassword = useMutation({
    mutationFn: async () => {
      const { authFetch } = await import("@/lib/auth/client");
      const res = await authFetch(`/api/mailboxes/${mailboxId}/password`, { method: "POST" });
      const json = (await res.json()) as { password?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to reset password");
      return json.password!;
    },
    onSuccess: (password) => {
      setCredPassword(password);
      setCredError(null);
    },
    onError: (error) => setCredError(error instanceof Error ? error.message : "Failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            Settings
          </h1>
          {address ? (
            <p className="mt-1 truncate no-font-mono text-sm text-[var(--muted-foreground)]">
              {address}
            </p>
          ) : (
            <Skeleton className="mt-2 h-4 w-52" />
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {mailbox.data?.type === "shared" && (
            <Badge variant="secondary">Shared</Badge>
          )}
          {mailbox.data?.isPrimary && (
            <Badge variant="secondary">Primary</Badge>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client connection</CardTitle>
          <CardDescription>
            IMAP and SMTP AUTH for this mailbox use the mailbox password below — not your administrator account
            password. A new mailbox password is only shown when you regenerate it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {connection.data && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--border)] p-3">
                <p className="font-medium">SMTP</p>
                {connection.data.connection.smtp.configured ? (
                  <ul className="mt-1 space-y-0.5 font-mono text-xs text-[var(--muted-foreground)]">
                    <li>{connection.data.connection.smtp.host}:{connection.data.connection.smtp.port}</li>
                    <li>{connection.data.connection.smtp.encryption}</li>
                    <li>{connection.data.connection.username}</li>
                  </ul>
                ) : (
                  <p className="mt-1 text-[var(--muted-foreground)]">Not configured</p>
                )}
              </div>
              <div className="rounded-lg border border-[var(--border)] p-3">
                <p className="font-medium">IMAP</p>
                {connection.data.connection.imap.configured ? (
                  <ul className="mt-1 space-y-0.5 font-mono text-xs text-[var(--muted-foreground)]">
                    <li>{connection.data.connection.imap.host}:{connection.data.connection.imap.port}</li>
                    <li>{connection.data.connection.imap.encryption}</li>
                    <li>{connection.data.connection.username}</li>
                  </ul>
                ) : (
                  <p className="mt-1 text-[var(--muted-foreground)]">Not configured</p>
                )}
              </div>
            </div>
          )}
          {credPassword && (
            <p className="rounded-xl border border-[color-mix(in_oklab,var(--destructive)_35%,var(--border))] bg-[color-mix(in_oklab,var(--destructive)_8%,var(--card))] px-3 py-2 font-mono text-sm text-[var(--foreground)]">
              New password (copy now): {credPassword}
            </p>
          )}
          {credError && <p className="text-sm text-[var(--destructive)]">{credError}</p>}
          <Button
            type="button"
            variant="outline"
            disabled={resetPassword.isPending}
            onClick={() => resetPassword.mutate()}
          >
            {resetPassword.isPending ? "Regenerating..." : "Regenerate mailbox password"}
          </Button>
          <p className="text-xs text-[var(--muted-foreground)]">
            Regenerating updates webmail, IMAP, and SMTP AUTH only. It does not change any user&apos;s admin console
            password.
          </p>
        </CardContent>
      </Card>

      {mailbox.isError && (
        <p className="rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-4 py-3 text-sm text-[var(--destructive)]">
          {mailbox.error instanceof Error
            ? mailbox.error.message
            : "Failed to load mailbox"}
        </p>
      )}

      <Card className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <CardHeader className="py-0">
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          {mailbox.data ? (
            <MailboxAvatarForm
              mailboxId={mailbox.data.id}
              hasAvatar={!!mailbox.data.hasAvatar}
              name={mailbox.data.displayName || mailbox.data.localPart}
            />
          ) : (
            <Skeleton className="h-24 w-24 rounded-full" />
          )}

          <div className="space-y-2">
            <Label htmlFor="displayName">Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={mailbox.data?.localPart ?? "Mailbox name"}
              disabled={mailbox.isLoading || updateName.isPending}
            />
          </div>
          <label className="flex items-start gap-3 rounded-xl bg-[var(--muted)] p-4">
            <Checkbox
              checked={useAllDomains}
              onChange={(event) => setUseAllDomains(event.target.checked)}
              disabled={mailbox.isLoading || updateName.isPending}
            />
            <span>
              <span className="block text-sm font-medium text-[var(--foreground)]">Use all domains</span>
              <span className="mt-1 block text-sm text-[var(--muted-foreground)]">
                Receive and send mail as this username on every active domain in this admin account.
              </span>
            </span>
          </label>
          {updateName.isError && (
            <p className="text-sm text-[var(--destructive)]">
              {updateName.error instanceof Error
                ? updateName.error.message
                : "Failed to update mailbox"}
            </p>
          )}
          {updateName.isSuccess && (
            <p className="text-sm text-[var(--success)]">Mailbox settings saved</p>
          )}
          <Button
            onClick={() => updateName.mutate()}
            disabled={mailbox.isLoading || updateName.isPending}
          >
            <Save className="h-4 w-4" />
            {updateName.isPending ? "Saving..." : "Save changes"}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <CardHeader className="py-0">
          <CardTitle>Aliases</CardTitle>
          <CardDescription>
            Extra addresses that deliver to this mailbox. You can also send mail
            from any alias.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          {aliases.isLoading && <Skeleton className="h-12 w-full rounded-2xl" />}
          {(aliases.data?.aliases ?? []).map((alias) => (
            <div
              key={alias.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--muted)] px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <AtSign className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                <p className="truncate no-font-mono text-sm font-medium text-[var(--foreground)]">
                  {alias.localPart}@{alias.hostname}
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Remove ${alias.localPart}@${alias.hostname}`}
                disabled={removeAlias.isPending}
                onClick={() => removeAlias.mutate(alias.id)}
              >
                <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
              </Button>
            </div>
          ))}
          {aliases.data && aliases.data.aliases.length === 0 && (
            <p className="rounded-2xl bg-[var(--muted)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
              No aliases yet.
            </p>
          )}
          {aliases.isError && (
            <p className="text-sm text-[var(--destructive)]">
              {aliases.error instanceof Error
                ? aliases.error.message
                : "Failed to load aliases"}
            </p>
          )}
          <div className="flex gap-2">
            <Input
              value={aliasLocalPart}
              onChange={(event) => setAliasLocalPart(event.target.value)}
              placeholder="alias"
              className="min-w-0 flex-1"
              disabled={addAlias.isPending}
            />
            <Select
              value={aliasDomainId}
              onChange={(event) => setAliasDomainId(event.target.value)}
              className="h-10 min-w-0 flex-1 text-sm"
              disabled={addAlias.isPending}
            >
              {(aliases.data?.availableDomains ?? []).map((domain) => (
                <option key={domain.id} value={domain.id}>
                  @{domain.hostname}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              disabled={!aliasLocalPart.trim() || !aliasDomainId || addAlias.isPending}
              onClick={() => addAlias.mutate()}
            >
              <AtSign className="h-4 w-4" />
              {addAlias.isPending ? "Adding..." : "Add alias"}
            </Button>
          </div>
          {addAlias.isError && (
            <p className="text-sm text-[var(--destructive)]">
              {addAlias.error instanceof Error ? addAlias.error.message : "Failed to add alias"}
            </p>
          )}
          {removeAlias.isError && (
            <p className="text-sm text-[var(--destructive)]">
              {removeAlias.error instanceof Error
                ? removeAlias.error.message
                : "Failed to remove alias"}
            </p>
          )}
        </CardContent>
      </Card>

      {mailbox.data?.type === "shared" && (
        <Card className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <CardHeader className="py-0">
            <CardTitle>Shared access</CardTitle>
            <CardDescription>
              Team members added here can read, send, organize, and manage mail in this inbox.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            {sharedAccess.isLoading && <Skeleton className="h-16 w-full rounded-2xl" />}
            {(sharedAccess.data?.members ?? []).map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--muted)] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                    {member.userName}
                  </p>
                  <p className="truncate text-xs text-[var(--muted-foreground)]">{member.userEmail}</p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove ${member.userName}`}
                  disabled={removeMember.isPending}
                  onClick={() => removeMember.mutate(member.userId)}
                >
                  <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                </Button>
              </div>
            ))}
            {sharedAccess.data && sharedAccess.data.members.length === 0 && (
              <p className="rounded-2xl bg-[var(--muted)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                No Team members have access yet.
              </p>
            )}
            {sharedAccess.isError && (
              <p className="text-sm text-[var(--destructive)]">
                {sharedAccess.error instanceof Error
                  ? sharedAccess.error.message
                  : "Failed to load shared access"}
              </p>
            )}
            <div className="flex gap-2">
              <Select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                className="h-10 min-w-0 flex-1 text-sm"
              >
                <option value="">Choose an account</option>
                {(sharedAccess.data?.availableUsers ?? [])
                  .filter(
                    (account) =>
                      !sharedAccess.data?.members.some((member) => member.userId === account.id),
                  )
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.email})
                    </option>
                  ))}
              </Select>
              <Button
                type="button"
                disabled={!selectedUserId || addMember.isPending}
                onClick={() => addMember.mutate()}
              >
                <UserPlus className="h-4 w-4" />
                {addMember.isPending ? "Adding..." : "Add user"}
              </Button>
            </div>
            {addMember.isError && (
              <p className="text-sm text-[var(--destructive)]">
                {addMember.error instanceof Error ? addMember.error.message : "Failed to add account"}
              </p>
            )}
          </CardContent>
        </Card>
      )}
      <Card className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <CardHeader className="py-0">
          <CardTitle className="text-[var(--destructive)]">Danger zone</CardTitle>
          <CardDescription>
            Deleting this mailbox removes its Cloudflare Email Routing rule, so
            new mail sent to {address || "this address"} will no longer be
            accepted. Messages already received are kept in the database but
            will no longer appear in any inbox. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          {removeMailbox.isError && (
            <p className="mb-4 rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-4 py-3 text-sm text-[var(--destructive)]">
              {removeMailbox.error instanceof Error
                ? removeMailbox.error.message
                : "Failed to delete mailbox"}
            </p>
          )}
          <Button
            type="button"
            variant="destructive"
            disabled={!mailbox.data || removeMailbox.isPending}
            onClick={() => {
              if (
                !window.confirm(
                  `Delete ${address}? This removes its email routing rule and cannot be undone.`,
                )
              )
                return;
              removeMailbox.mutate();
            }}
          >
            <Trash2 className="h-4 w-4" />
            {removeMailbox.isPending ? "Deleting..." : "Delete mailbox"}
          </Button>
        </CardContent>
      </Card>

{/* 
      <Card className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <CardHeader className="py-0">
          <CardTitle>Address</CardTitle>
          <CardDescription>
            The email address, username, and domain are managed as routing
            resources.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-5">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
              Email
            </p>
            <p className="truncate no-font-mono text-sm text-[var(--foreground)]">
              {address || "-"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
              Username
            </p>
            <p className="truncate no-font-mono text-sm text-[var(--foreground)]">
              {mailbox.data?.localPart ?? "-"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
              Domain
            </p>
            <p className="truncate no-font-mono text-sm text-[var(--foreground)]">
              {mailbox.data?.hostname ?? "-"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
              Routing
            </p>
            <p className="flex items-center gap-2 text-sm text-[var(--foreground)]">
              <Mail className="h-4 w-4 text-[var(--muted-foreground)]" />
              Cloudflare Email Routing
            </p>
          </div>
        </CardContent>
      </Card> */}
    </div>
  );
}
