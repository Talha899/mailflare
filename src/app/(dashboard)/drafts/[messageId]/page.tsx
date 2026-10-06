import DraftsPage from "../page";
import { OpenDraftOnRoute } from "./open-draft-on-route";

type DraftRoutePageProps = { params: Promise<{ messageId: string }> };

export default async function DraftMessagePage({ params }: DraftRoutePageProps) {
	const { messageId } = await params;
	return <><DraftsPage /><OpenDraftOnRoute draftId={messageId} /></>;
}
