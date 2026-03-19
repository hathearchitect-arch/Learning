'use server';

import { type NextRequest, NextResponse } from 'next/server';
import { auth, getActiveOrganization, getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { agent, agentUser, member } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { patchAgentSchema } from './schema';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
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

  //check if user has app-level admin permissions
  const adminPermission = await auth.api.userHasPermission({
    body: {
      userId: session.user.id,
      permission: {
        agent: ['retrieve'],
      },
    },
  });

  //check if user has org-level permissions
  const organizationPermission = await auth.api.hasPermission({
    headers: request.headers,
    body: {
      organizationId: activeOrganization.id,
      permissions: {
        agent: ['retrieve'],
      },
    },
  });

  const { agentId } = await params;

  // check to see if the user has agent-level permissions
  const agentUserAccess = await db.query.agentUser.findFirst({
    where: and(
      eq(agentUser.agentId, agentId),
      eq(agentUser.userId, session.user.id),
      eq(agentUser.isActive, true),
    ),
  });
  const userHasAgentAccess = agentUserAccess !== null;

  // User must be an admin or have agent access
  if (
    !adminPermission.success &&
    !organizationPermission.success &&
    !userHasAgentAccess
  ) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  // get the user's organization role
  const userOrganizationRole = await db.query.member.findFirst({
    where: and(
      eq(member.userId, session.user.id),
      eq(member.organizationId, activeOrganization.id),
    ),
    columns: {
      userId: true,
      role: true,
    },
  });

  if (!userOrganizationRole) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    // if the user's role is member, then return limited field set
    if (userOrganizationRole?.role === 'member') {
      const requestedAgent = await db.query.agent.findFirst({
        columns: {
          id: true,
          name: true,
          description: true,
          greeting: true,
        },
        where: and(
          eq(agent.id, agentId),
          eq(agent.organizationId, activeOrganization.id),
        ),
        with: {
          suggestedActions: true,
        },
      });

      if (!requestedAgent) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'Agent not found' },
          { status: 404 },
        );
      }

      return NextResponse.json<ApiResponse<typeof requestedAgent>>({
        success: true,
        data: requestedAgent,
      });
    } else {
      // if the user is an admin, return all fields
      const requestedAgent = await db.query.agent.findFirst({
        where: and(
          eq(agent.id, agentId),
          eq(agent.organizationId, activeOrganization.id),
        ),
        with: {
          suggestedActions: true,
          folders: {
            with: {
              folder: true,
            },
          },
        },
      });

      if (!requestedAgent) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: 'Agent not found' },
          { status: 404 },
        );
      }

      return NextResponse.json<ApiResponse<typeof requestedAgent>>({
        success: true,
        data: requestedAgent,
      });
    }
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const session = await getSession();
  const activeOrganization = await getActiveOrganization(request);
  if (!session?.user.role || !activeOrganization) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Session or active organization is invalid',
      },
      { status: 401 },
    );
  }

  //check if user has app-level admin permission to delete agent
  const adminPermission = await auth.api.userHasPermission({
    body: {
      userId: session.user.id,
      permission: {
        agent: ['delete'],
      },
    },
  });

  //check if user has org-level permission to delete agent
  const organizationPermission = await auth.api.hasPermission({
    headers: request.headers,
    body: {
      organizationId: activeOrganization.id,
      permissions: {
        agent: ['delete'],
      },
    },
  });

  if (!adminPermission.success && !organizationPermission.success) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    const { agentId } = await params;
    console.log('Deleting agent with ID:', agentId);
    if (!agentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bad Request',
          message: 'Agent ID is required',
        },
        { status: 400 },
      );
    }

    const deletedAgent = await db
      .delete(agent)
      .where(
        and(
          eq(agent.id, agentId),
          eq(agent.organizationId, activeOrganization.id),
        ),
      )
      .returning();

    if (deletedAgent.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Agent not found' },
        { status: 404 },
      );
    }
    return NextResponse.json<ApiResponse<(typeof deletedAgent)[0]>>({
      success: true,
      data: deletedAgent[0],
    });
  } catch (error) {
    console.error('Error deleting agent:', error);
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

export async function PATCH(
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
    const { agentId } = await params;
    if (!agentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bad Request',
          message: 'Agent ID is required',
        },
        { status: 400 },
      );
    }

    //check if user has app-level admin permission to delete agent
    const adminPermission = await auth.api.userHasPermission({
      body: {
        userId: session.user.id,
        permission: {
          agent: ['update'],
        },
      },
    });

    //check if user has org-level permission to delete agent
    const organizationPermission = await auth.api.hasPermission({
      headers: request.headers,
      body: {
        organizationId: activeOrganization.id,
        permissions: {
          agent: ['update'],
        },
      },
    });

    if (!adminPermission.success && !organizationPermission.success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsedData = patchAgentSchema.safeParse(body);
    if (!parsedData.success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Invalid data' },
        { status: 400 },
      );
    }
    const updatedAgent = await db
      .update(agent)
      .set({
        ...parsedData.data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(agent.id, agentId),
          eq(agent.organizationId, activeOrganization.id),
        ),
      )
      .returning();
    if (updatedAgent.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Agent not found or unauthorized' },
        { status: 404 },
      );
    }
    return NextResponse.json<ApiResponse<(typeof updatedAgent)[0]>>({
      success: true,
      data: updatedAgent[0],
    });
  } catch (error) {
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
