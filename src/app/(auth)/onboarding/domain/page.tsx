import { AuthGuard } from "@/components/auth/auth-guard";
import { DomainOnboardingClient } from "./domain-onboarding-client";

export const dynamic = "force-dynamic";

export default function DomainOnboardingPage() {
	return (
		<AuthGuard requireMailbox={false}>
			<DomainOnboardingClient />
		</AuthGuard>
	);
}
