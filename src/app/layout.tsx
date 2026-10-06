import type { Metadata } from "next";
import { Figtree, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { sidebarBootstrapScript } from "@/components/sidebar-state-utils";
import { themeBootstrapScript } from "@/components/theme-utils";
import "./globals.css";

const dispatchSans = Figtree({
	variable: "--font-dispatch-sans",
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
});

const dispatchMono = IBM_Plex_Mono({
	variable: "--font-dispatch-mono",
	subsets: ["latin"],
	weight: ["400", "500"],
});

export const metadata: Metadata = {
	title: "Dispatch",
	description: "Private email for your domain",
	icons: { icon: "/api/branding/icon" },
	robots: {
		index: false,
		follow: false,
		noarchive: true,
		nosnippet: true,
		noimageindex: true,
		googleBot: {
			index: false,
			follow: false,
			noarchive: true,
			nosnippet: true,
			noimageindex: true,
		},
	},
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: sidebarBootstrapScript }} />
				<script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
				<link rel="icon" href="/api/branding/icon" />
			</head>
			<body className={`${dispatchSans.variable} ${dispatchMono.variable} antialiased`}>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
