"use client";

import * as AlertDialog from "@radix-ui/react-dialog";
import { AlertTriangle } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import type { ConfirmOptions } from "./confirm-dialog-types";

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Mount once near the root. Replaces window.confirm with an accessible,
 * themed dialog: focus moves to the safe action, Escape cancels, and a
 * destructive confirmation can require typing a word first.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
	const [options, setOptions] = useState<ConfirmOptions | null>(null);
	const [typed, setTyped] = useState("");
	const resolver = useRef<((value: boolean) => void) | null>(null);
	// The dialog is opened from code, not a Radix trigger, so remember where focus was.
	const returnFocus = useRef<HTMLElement | null>(null);

	const confirm = useCallback<ConfirmFn>((next) => {
		returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		resolver.current?.(false);
		setTyped("");
		setOptions(next);
		return new Promise<boolean>((resolve) => {
			resolver.current = resolve;
		});
	}, []);

	function settle(value: boolean) {
		resolver.current?.(value);
		resolver.current = null;
		setOptions(null);
	}

	const destructive = options?.tone !== "default";
	const needsTyping = !!options?.confirmText;
	const canConfirm = !needsTyping || typed.trim() === options?.confirmText;

	return (
		<ConfirmContext.Provider value={confirm}>
			{children}
			<AlertDialog.Root open={options !== null} onOpenChange={(open) => !open && settle(false)}>
				<AlertDialog.Portal>
					<AlertDialog.Overlay className="dialog-overlay fixed inset-0 z-[300] bg-[var(--overlay)] backdrop-blur-[2px]" />
					<AlertDialog.Content
						role="alertdialog"
						className="dialog-content fixed left-1/2 top-1/2 z-[300] w-[min(440px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-[var(--shadow-lg)] focus:outline-none"
						onCloseAutoFocus={(event) => {
							if (!returnFocus.current?.isConnected) return;
							event.preventDefault();
							returnFocus.current.focus();
						}}
						onOpenAutoFocus={(event) => {
							// Land on the safe choice unless a confirmation word is required.
							if (needsTyping) return;
							event.preventDefault();
							(event.currentTarget as HTMLElement).querySelector<HTMLButtonElement>("[data-confirm-cancel]")?.focus();
						}}
					>
						{options && (
							<form
								onSubmit={(event) => {
									event.preventDefault();
									if (canConfirm) settle(true);
								}}
							>
								<div className="flex gap-4">
									{destructive && (
										<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--destructive-soft)] text-[var(--destructive)]">
											<AlertTriangle className="h-5 w-5" />
										</span>
									)}
									<div className="min-w-0 flex-1 space-y-2">
										<AlertDialog.Title className="text-[17px] font-semibold tracking-tight text-[var(--foreground)]">
											{options.title}
										</AlertDialog.Title>
										{options.description ? (
											<AlertDialog.Description className="text-sm leading-relaxed text-[var(--muted-foreground)]">
												{options.description}
											</AlertDialog.Description>
										) : (
											<AlertDialog.Description className="sr-only">Confirm this action</AlertDialog.Description>
										)}
										{needsTyping && (
											<label className="block pt-2 text-sm text-[var(--muted-foreground)]">
												Type <span className="font-mono font-medium text-[var(--foreground)]">{options.confirmText}</span> to confirm
												<Input
													autoFocus
													value={typed}
													onChange={(event) => setTyped(event.target.value)}
													className="mt-2"
													autoComplete="off"
													spellCheck={false}
												/>
											</label>
										)}
									</div>
								</div>
								<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
									<Button type="button" variant="outline" data-confirm-cancel onClick={() => settle(false)}>
										{options.cancelLabel ?? "Cancel"}
									</Button>
									<Button type="submit" variant={destructive ? "destructive" : "default"} disabled={!canConfirm}>
										{options.confirmLabel ?? (destructive ? "Delete" : "Confirm")}
									</Button>
								</div>
							</form>
						)}
					</AlertDialog.Content>
				</AlertDialog.Portal>
			</AlertDialog.Root>
		</ConfirmContext.Provider>
	);
}

/** `if (await confirm({ title, description })) …` — resolves false when dismissed. */
export function useConfirm(): ConfirmFn {
	const confirm = useContext(ConfirmContext);
	if (!confirm) throw new Error("useConfirm must be used inside ConfirmProvider");
	return confirm;
}
