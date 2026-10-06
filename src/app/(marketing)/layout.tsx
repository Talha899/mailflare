import type { Metadata } from "next";
import { HomeAuthProvider } from "@/app/home-auth";
import { getHomeBranding } from "@/app/home-server-utils";
import { MarketingFooter } from "@/components/marketing/site-footer";
import { MarketingHeader } from "@/components/marketing/site-header";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
	const branding = await getHomeBranding();
	return {
		title: {
			default: branding.appName,
			template: `%s · ${branding.appName}`,
		},
		description: "Private email for your domain. Add MX, create mailboxes, send and receive on a host you run.",
		robots: { index: true, follow: true },
		icons: { icon: branding.hasCustomIcon ? "/api/branding/icon" : "/logo.svg" },
	};
}

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
	const branding = await getHomeBranding();
	const iconSrc = branding.hasCustomIcon ? "/api/branding/icon" : "/logo.svg";

	return (
		<HomeAuthProvider>
			<div className="flex min-h-dvh flex-col bg-[var(--background)] text-[var(--foreground)]">
				<MarketingHeader appName={branding.appName} iconSrc={iconSrc} />
				<main className="flex-1">{children}</main>
				<MarketingFooter appName={branding.appName} />
			</div>
		</HomeAuthProvider>
	);
}
