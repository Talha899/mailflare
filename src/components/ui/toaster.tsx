"use client";

import { Toaster as HotToaster } from "react-hot-toast";

/**
 * App-wide toast host. Use `toast.success("Saved")` / `toast.error(message)`
 * from react-hot-toast for transient feedback; inline <Alert> for anything the
 * user must read before continuing.
 */
export function Toaster() {
	return (
		<HotToaster
			position="bottom-center"
			gutter={8}
			containerStyle={{ bottom: 20 }}
			toastOptions={{
				duration: 3500,
				className: "dispatch-toast",
				style: {
					background: "var(--foreground)",
					color: "var(--background)",
					borderRadius: "12px",
					padding: "10px 14px",
					fontSize: "14px",
					fontWeight: 500,
					boxShadow: "var(--shadow-lg)",
					maxWidth: "min(420px, calc(100vw - 32px))",
				},
				success: { iconTheme: { primary: "var(--success)", secondary: "var(--background)" } },
				error: { duration: 5000, iconTheme: { primary: "var(--destructive)", secondary: "var(--background)" } },
			}}
		/>
	);
}
