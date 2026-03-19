import { getSession, getActiveOrganization } from '@/lib/auth';
import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { addUserRequestSchema } from './schema';
import { getUser } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
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

  //check if user has app-level admin permission
  const adminPermission = await auth.api.userHasPermission({
    body: {
      userId: session.user.id,
      permission: {
        organizationMembership: ['create'],
      },
    },
  });

  //check if user has org-level admin permission
  const organizationPermission = await auth.api.hasPermission({
    headers: request.headers,
    body: {
      organizationId: activeOrganization.id,
      permissions: {
        organizationMembership: ['create'],
      },
    },
  });
  if (!adminPermission.success && !organizationPermission.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'User does not have permission to add member to organization',
      },
      { status: 401 },
    );
  }

  try {
    const json = await request.json();
    const requestBody = addUserRequestSchema.parse(json);
    let userId: string;
    if (!requestBody.userId) {
      const user = await getUser(requestBody.userEmail || '');
      if (user.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Bad Request',
            message: 'Invalid user email',
          },
          { status: 400 },
        );
      }
      userId = user[0].id;
    } else {
      userId = requestBody.userId;
    }

    const addUserBetterAuthApi = await auth.api.addMember({
      body: {
        userId,
        organizationId: activeOrganization.id,
        role: 'member',
      },
    });

    return Response.json({
      status: 200,
      success: true,
      message: `user ${requestBody.userId} added to organization ${activeOrganization.name}`,
      data: addUserBetterAuthApi,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Bad Request' },
      { status: 500 },
    );
  }
}
