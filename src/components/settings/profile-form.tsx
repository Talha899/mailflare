"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authFetch } from "@/lib/auth/client";
import { dispatchProfileNameChanged } from "@/lib/profile/name-client";
import { ProfileAvatarForm } from "./profile-avatar-form";
import type { ProfileFormProps, ProfileFormResponse } from "./types";

export function ProfileForm({
  initialName,
  initialResetEmail,
  email,
}: ProfileFormProps) {
  const [name, setName] = useState(initialName);
  const [resetEmail, setResetEmail] = useState(initialResetEmail);
  const [savedName, setSavedName] = useState(initialName);
  const [savedResetEmail, setSavedResetEmail] = useState(initialResetEmail);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [recoveryStatus, setRecoveryStatus] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingRecovery, setSavingRecovery] = useState(false);

  const [recoveryPassword, setRecoveryPassword] = useState("");
  const recoveryChanged = resetEmail.trim() !== savedResetEmail;

  async function saveProfile(nextName: string, nextResetEmail: string, currentPassword?: string) {
    try {
      const res = await authFetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName, resetEmail: nextResetEmail, currentPassword }),
      });
      const data = (await res.json()) as ProfileFormResponse;

      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Failed to update account",
        );
      }

      const savedName = data.user?.name ?? nextName.trim();
      const savedResetEmail = data.user?.resetEmail ?? "";
      setName(savedName);
      setResetEmail(savedResetEmail);
      setSavedName(savedName);
      setSavedResetEmail(savedResetEmail);
      dispatchProfileNameChanged(savedName);
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error("Failed to update account");
    }
  }

  async function onProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileStatus(null);
    try {
      await saveProfile(name, savedResetEmail);
      setProfileStatus("Saved");
    } catch (error) {
      setProfileStatus(
        error instanceof Error ? error.message : "Failed to update account",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function onRecoverySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingRecovery(true);
    setRecoveryStatus(null);
    try {
      await saveProfile(savedName, resetEmail, recoveryPassword);
      setRecoveryPassword("");
      setRecoveryStatus("Saved");
    } catch (error) {
      setRecoveryStatus(
        error instanceof Error
          ? error.message
          : "Failed to update recovery email",
      );
    } finally {
      setSavingRecovery(false);
    }
  }

  return (
    <>
      <form
        onSubmit={onProfileSubmit}
        className="space-y-6 rounded-b-lg rounded-t-3xl bg-[var(--card)] p-6"
      >
        <div className="flex items-center gap-4">
          <ProfileAvatarForm name={name} colorSeed={email} />
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              Profile picture
            </p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Choose a picture to show across your account.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="accountEmail">Current email</Label>
          <Input
            id="accountEmail"
            value={email}
            type="email"
            readOnly
            aria-readonly="true"
            className="bg-[var(--muted)]"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={savingProfile || name.trim() === savedName}
          >
            {savingProfile ? "Saving..." : "Save profile"}
          </Button>
          {profileStatus && (
            <p className="text-sm text-[var(--muted-foreground)]">{profileStatus}</p>
          )}
        </div>
      </form>

      <form
        onSubmit={onRecoverySubmit}
        className="space-y-4 rounded-lg bg-[var(--card)] p-6"
      >
        <div>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            Recovery email
          </h3>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Used to recover access if you cannot sign in.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="resetEmail">Email address</Label>
          <Input
            id="resetEmail"
            value={resetEmail}
            onChange={(event) => setResetEmail(event.target.value)}
            type="email"
            placeholder="recovery@example.com"
          />
        </div>
        {recoveryChanged && (
          <div className="space-y-2">
            <Label htmlFor="recoveryCurrentPassword">Current account password</Label>
            <Input
              id="recoveryCurrentPassword"
              type="password"
              autoComplete="current-password"
              value={recoveryPassword}
              onChange={(event) => setRecoveryPassword(event.target.value)}
              required
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              Password reset links go to this address, so changing it needs your password.
            </p>
          </div>
        )}
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={savingRecovery || !recoveryChanged || !recoveryPassword}
          >
            {savingRecovery ? "Saving..." : "Save recovery email"}
          </Button>
          {recoveryStatus && (
            <p className="text-sm text-[var(--muted-foreground)]">{recoveryStatus}</p>
          )}
        </div>
      </form>
    </>
  );
}
