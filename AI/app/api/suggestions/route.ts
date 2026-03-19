import { getSession, getActiveOrganization } from "@/lib/auth";
import { getSuggestionsByDocumentId } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await getSession();
  const activeOrganization = await getActiveOrganization(request);
  
  if (!session?.user || !activeOrganization) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', message: "Session or active organization is invalid" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId");

  if (!documentId) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter documentId is required.",
    ).toResponse();
  }

  const suggestions = await getSuggestionsByDocumentId({
    documentId,
  });

  const [suggestion] = suggestions;

  if (!suggestion) {
    return Response.json([], { status: 200 });
  }

  if (suggestion.userId !== session.user.id) {
    return new ChatSDKError("forbidden:api").toResponse();
  }

  return Response.json(suggestions, { status: 200 });
}
