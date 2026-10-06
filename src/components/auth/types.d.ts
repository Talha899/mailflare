import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type AuthShellStep = {
	label: string;
	active: boolean;
};

export type AuthShellVariant = "mailbox" | "admin";

export type AuthShellProps = {
	icon: LucideIcon;
	title: string;
	description?: ReactNode;
	children: ReactNode;
	footer?: ReactNode;
	steps?: AuthShellStep[];
	/** Visual product lane — mailbox webmail vs admin console. */
	variant?: AuthShellVariant;
	/** Optional eyebrow above the brand (defaults differ by variant). */
	eyebrow?: string;
};
