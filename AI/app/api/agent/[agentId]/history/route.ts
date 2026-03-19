import { auth, getSession, getActiveOrganization } from '@/lib/auth';
import { NextResponse, type NextRequest } from 'next/server';
import { getChatsByUserId, getAgent, getUser } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import type { Chat } from '@/lib/db/types';

type ChatHistory = {
  chats: Array<Chat>;
  hasMore: boolean;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const session = await getSession();
  const activeOrganization = await getActiveOrganization(request);

  if (!session?.user || !activeOrganization) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Session or active organization is invalid',
      },
      { status: 401 },
    );
  }
  try {
    const { searchParams } = request.nextUrl;
    const { agentId } = await params;

    const agent = await getAgent(agentId);
    if (agent.organizationId !== activeOrganization.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Agent does not belong to active organization',
        },
        { status: 401 },
      );
    }

    const limit = Number.parseInt(searchParams.get('limit') || '10');
    let userId = searchParams.get('userId');
    const userEmail = searchParams.get('userEmail');
    const startingAfter = searchParams.get('starting_after');
    const endingBefore = searchParams.get('ending_before');

    if (userId && userEmail) {
      return new ChatSDKError(
        'bad_request:api',
        'Unsupported query parameters. Provide either userId or userEmail, but not both',
      ).toResponse();
    }

    // if userEmail provided, use it to assign value to userId
    if (userEmail) {
      try {
        const userFromEmailQueryParameter = await getUser(userEmail);
        userId = userFromEmailQueryParameter[0].id;
      } catch (error) {
        return new ChatSDKError(
          'not_found:user',
          'Unable to find user for the provided email',
        ).toResponse();
      }
    }

    if (startingAfter && endingBefore) {
      return new ChatSDKError(
        'bad_request:api',
        'Only one of starting_after or ending_before can be provided.',
      ).toResponse();
    }

    //check if user has app-level admin permission to view all history
    const adminPermission = await auth.api.userHasPermission({
      body: {
        userId: session.user.id,
        permission: {
          chat: ['retrieve'],
        },
      },
    });

    //check if user has org-level permission to view all history
    const organizationPermission = await auth.api.hasPermission({
      headers: request.headers,
      body: {
        organizationId: activeOrganization.id,
        permissions: {
          chat: ['retrieve'],
        },
      },
    });

    let chats: ChatHistory;
    if ((adminPermission.success || organizationPermission.success) && userId) {
      // app and org-level admins can see other's user's chats with agent
      // userId or userEmail search params allow for search of a specific user's chats
      chats = await getChatsByUserId({
        userId,
        agentId: agentId,
        limit,
        startingAfter,
        endingBefore,
      });
    } else {
      chats = await getChatsByUserId({
        userId: session.user.id,
        agentId: agentId,
        limit,
        startingAfter,
        endingBefore,
      });
    }

    return Response.json(chats);
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Bad Request',
        message: 'Unable to process new user request',
      },
      { status: 400 },
    );
  }
}
