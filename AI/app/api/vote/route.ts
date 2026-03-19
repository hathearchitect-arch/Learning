import { auth, getSession, getActiveOrganization } from "@/lib/auth";
import { getChatById, getVotesByChatId, voteMessage } from "@/lib/db/queries";
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
  const chatId = searchParams.get("chatId");

  if (!chatId) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameter chatId is required.",
    ).toResponse();
  }

  const chat = await getChatById({ id: chatId });

  if (!chat) {
    return new ChatSDKError("not_found:chat").toResponse();
  }

  //check if user has app-level admin permissions
  const adminPermission = await auth.api.userHasPermission({
    body: {
      userId: session.user.id,
      permission: {
        agent: ["retrieve"]
      },
    },
  });

  //check if user has org-level permissions
  const organizationPermission = await auth.api.hasPermission({
    headers: request.headers,
    body: {
      organizationId: activeOrganization.id,
      permissions: {
        agent: ["retrieve"]
      }
    }
  });

  if (chat.userId !== session.user.id && !adminPermission.success && !organizationPermission.success) {
    return new ChatSDKError("forbidden:vote").toResponse();
  }

  const votes = await getVotesByChatId({ id: chatId });

  return Response.json(votes, { status: 200 });
}

export async function PATCH(request: Request) {
  const {
    chatId,
    messageId,
    type,
  }: { chatId: string; messageId: string; type: "up" | "down" } =
  await request.json();

  const session = await getSession();
  const activeOrganization = await getActiveOrganization(request);
  
  if (!session?.user || !activeOrganization) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', message: "Session or active organization is invalid" },
      { status: 401 },
    );
  }

  if (!chatId || !messageId || !type) {
    return new ChatSDKError(
      "bad_request:api",
      "Parameters chatId, messageId, and type are required.",
    ).toResponse();
  }

  const chat = await getChatById({ id: chatId });

  if (!chat) {
    return new ChatSDKError("not_found:vote").toResponse();
  }

  //check if user has app-level admin permissions
  const adminPermission = await auth.api.userHasPermission({
    body: {
      userId: session.user.id,
      permission: {
        agent: ["retrieve"]
      },
    },
  });

  //check if user has org-level permissions
  const organizationPermission = await auth.api.hasPermission({
    headers: request.headers,
    body: {
      organizationId: activeOrganization.id,
      permissions: {
        agent: ["retrieve"]
      }
    }
  });

  if (chat.userId !== session.user.id && !adminPermission.success && !organizationPermission.success) {
    return new ChatSDKError("forbidden:vote").toResponse();
  }

  await voteMessage({
    chatId,
    messageId,
    type: type,
  });

  return new Response("Message voted", { status: 200 });
}
