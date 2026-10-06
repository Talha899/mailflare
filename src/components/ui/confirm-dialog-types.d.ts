import type * as React from "react";

export type ConfirmOptions = {
	title: string;
	description?: React.ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	/** "destructive" (default) shows the warning treatment and a red action. */
	tone?: "destructive" | "default";
	/** When set, the user must type this exact text before confirming. */
	confirmText?: string;
};
