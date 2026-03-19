import { auth, getSession, getActiveOrganization } from "@/lib/auth";
import type { ArtifactKind } from "@/components/artifact";
import {
  deleteDocumentsByIdAfterTimestamp,
  getDocumentsById,
  saveDocument,
} from "@/lib/db/queries";
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
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter id is missing",
    ).toResponse();
  }

  const documents = await getDocumentsById({ id });

  const [document] = documents;

  if (!document) {
    return new ChatSDKError("not_found:document").toResponse();
  }

  //check if user has app-level admin permissions
  const adminPermission = await auth.api.userHasPermission({
    body: {
      userId: session.user.id,
      permission: {
        document: ["retrieve"]
      },
    },
  });

  //check if user has org-level permissions
  const organizationPermission = await auth.api.hasPermission({
    headers: request.headers,
    body: {
      organizationId: activeOrganization.id,
      permissions: {
        document: ["retrieve"]
      }
    }
  });

  //throw permission error if document doesn't belong to user and no admin permissions
  if (document.userId !== session.user.id && !adminPermission.success && !organizationPermission.success) {
    return new ChatSDKError("forbidden:document").toResponse();
  }

  return Response.json(documents, { status: 200 });
}

export async function POST(request: Request) {
  const session = await getSession();
  const activeOrganization = await getActiveOrganization(request);
  
  if (!session?.user || !activeOrganization) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', message: "Session or active organization is invalid" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter id is required.",
    ).toResponse();
  }

  const {
    content,
    title,
    kind,
  }: { content: string; title: string; kind: ArtifactKind } =
    await request.json();

  const documents = await getDocumentsById({ id });

  if (documents.length > 0) {
    const [document] = documents;

    if (document.userId !== session.user.id) {
      return new ChatSDKError("forbidden:document").toResponse();
    }
  }

  const document = await saveDocument({
    id,
    content,
    title,
    kind,
    userId: session.user.id,
  });

  return Response.json(document, { status: 200 });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  const activeOrganization = await getActiveOrganization(request);
  
  if (!session?.user || !activeOrganization) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', message: "Session or active organization is invalid" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const timestamp = searchParams.get("timestamp");

  if (!id) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter id is required.",
    ).toResponse();
  }

  if (!timestamp) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter timestamp is required.",
    ).toResponse();
  }

  const documents = await getDocumentsById({ id });

  const [document] = documents;

  //check if user has app-level admin permissions
  const adminPermission = await auth.api.userHasPermission({
    body: {
      userId: session.user.id,
      permission: {
        document: ["delete"]
      },
    },
  });

  //check if user has org-level permissions
  const organizationPermission = await auth.api.hasPermission({
    headers: request.headers,
    body: {
      organizationId: activeOrganization.id,
      permissions: {
        document: ["delete"]
      }
    }
  });

  //throw permission error if document doesn't belong to user and no admin permissions
  if (document.userId !== session.user.id && !adminPermission.success && !organizationPermission.success) {
    return new ChatSDKError("forbidden:document").toResponse();
  }

  const documentsDeleted = await deleteDocumentsByIdAfterTimestamp({
    id,
    timestamp: new Date(timestamp),
  });

  return Response.json(documentsDeleted, { status: 200 });
}
