'use server';

import { type NextRequest, NextResponse } from 'next/server';
import { auth, getActiveOrganization, getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { agentUser, agent, member } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { addUserSchema, removeUserSchema } from './schema';
import { z } from 'zod';
import { getUser } from '@/lib/db/queries';

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
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Unauthorized',
      },
      { status: 401 },
    );
  }

  // Check if user has admin permissions
  const adminPermission = await auth.api.userHasPermission({
    body: {
      userId: session.user.id,
      permission: {
        agent: ['retrieve'],
      },
    },
  });

  // Check if user has org-level permissions
  const organizationPermission = await auth.api.hasPermission({
    headers: request.headers,
    body: {
      organizationId: activeOrganization.id,
      permissions: {
        agent: ['retrieve'],
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

    // Verify agent belongs to the current organization
    const agentExists = await db.query.agent.findFirst({
      where: and(
        eq(agent.id, agentId),
        eq(agent.organizationId, activeOrganization.id),
      ),
    });

    if (!agentExists) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Agent not found' },
        { status: 404 },
      );
    }

    // Get all users associated with this agent
    const agentUsers = await db.query.agentUser.findMany({
      where: eq(agentUser.agentId, agentId),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json<ApiResponse<typeof agentUsers>>({
      success: true,
      data: agentUsers,
    });
  } catch (error) {
    console.error('Error fetching agent users:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to fetch agent users',
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const session = await getSession();
  const activeOrganization = await getActiveOrganization(request);

  if (!session?.user || !activeOrganization) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Unauthorized',
      },
      { status: 401 },
    );
  }

  // Check if user has admin permissions
  const adminPermission = await auth.api.userHasPermission({
    body: {
      userId: session.user.id,
      permission: {
        agent: ['update'],
      },
    },
  });

  // Check if user has org-level permissions
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

  try {
    const { agentId } = await params;
    const body = await request.json();
    console.log('Adding user to agent:', body);
    const validatedData = addUserSchema.parse(body);

    // Verify agent belongs to the current organization
    const agentExists = await db.query.agent.findFirst({
      where: and(
        eq(agent.id, agentId),
        eq(agent.organizationId, activeOrganization.id),
      ),
    });

    if (!agentExists) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Agent not found' },
        { status: 404 },
      );
    }

    // Check if user exists by email
    const existingUsers = await getUser(validatedData.email);
    const existingUser = existingUsers.length > 0 ? existingUsers[0] : null;

    let userId: string | null = null;
    let inviteEmail: string | null = null;
    let inviteStatus: 'accepted' | 'pending' = 'pending';

    if (existingUser) {
      // User exists - check if they are a member of the organization
      const userMember = await db.query.member.findFirst({
        where: and(
          eq(member.userId, existingUser.id),
          eq(member.organizationId, activeOrganization.id),
        ),
      });

      if (!userMember) {
        // User exists but is not a member - add them to the organization first
        try {
          await db.insert(member).values({
            id: crypto.randomUUID(),
            userId: existingUser.id,
            organizationId: activeOrganization.id,
            role: 'member', // Default role for auto-added users
            createdAt: new Date(),
          });
        } catch (error) {
          // Handle potential duplicate key error in case of race condition
          console.log(
            'User may have been added to organization concurrently:',
            error,
          );
        }
      }

      userId = existingUser.id;
      inviteStatus = 'accepted'; // Existing users get immediate access
    } else {
      // User doesn't exist - store as invite email with pending status
      inviteEmail = validatedData.email;
      inviteStatus = 'pending';
    }

    // Check if user/email is already associated with this agent
    let existingAgentUser: any = null;
    if (userId) {
      existingAgentUser = await db.query.agentUser.findFirst({
        where: and(
          eq(agentUser.agentId, agentId),
          eq(agentUser.userId, userId),
        ),
      });
    } else if (inviteEmail) {
      existingAgentUser = await db.query.agentUser.findFirst({
        where: and(
          eq(agentUser.agentId, agentId),
          eq(agentUser.inviteEmail, inviteEmail),
        ),
      });
    }

    if (existingAgentUser) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: existingUser
            ? 'User already has access to this agent'
            : 'Email is already invited to this agent',
        },
        { status: 400 },
      );
    }

    // Add user or invite to agent
    const insertValues: any = {
      agentId,
      inviteStatus,
      isActive: validatedData.isActive,
    };

    if (userId) {
      insertValues.userId = userId;
    }
    if (inviteEmail) {
      insertValues.inviteEmail = inviteEmail;
    }

    const newAgentUser = await db
      .insert(agentUser)
      .values(insertValues)
      .returning();

    // Get the created record with user details (if user exists)
    const createdAgentUser = await db.query.agentUser.findFirst({
      where: eq(agentUser.id, newAgentUser[0].id),
      with: existingUser
        ? {
            user: {
              columns: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          }
        : undefined,
    });

    return NextResponse.json<ApiResponse<typeof createdAgentUser>>({
      success: true,
      data: createdAgentUser,
    });
  } catch (error) {
    console.error('Error adding user to agent:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invalid request data',
        },
        { status: 400 },
      );
    }

    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to add user to agent',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const session = await getSession();
  const activeOrganization = await getActiveOrganization(request);

  if (!session?.user || !activeOrganization) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Unauthorized',
      },
      { status: 401 },
    );
  }

  // Check if user has admin permissions
  const adminPermission = await auth.api.userHasPermission({
    body: {
      userId: session.user.id,
      permission: {
        agent: ['update'],
      },
    },
  });

  // Check if user has org-level permissions
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

  try {
    const { agentId } = await params;
    const body = await request.json();
    const validatedData = removeUserSchema.parse(body);

    // Verify agent belongs to the current organization
    const agentExists = await db.query.agent.findFirst({
      where: and(
        eq(agent.id, agentId),
        eq(agent.organizationId, activeOrganization.id),
      ),
    });

    if (!agentExists) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Agent not found' },
        { status: 404 },
      );
    }

    // Build the where condition based on what was provided
    let whereCondition: any;
    if (validatedData.userId) {
      whereCondition = and(
        eq(agentUser.agentId, agentId),
        eq(agentUser.userId, validatedData.userId),
      );
    } else if (validatedData.email) {
      whereCondition = and(
        eq(agentUser.agentId, agentId),
        eq(agentUser.inviteEmail, validatedData.email),
      );
    }

    // Find the agent user record
    const existingAgentUser = await db.query.agentUser.findFirst({
      where: whereCondition,
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!existingAgentUser) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: validatedData.userId
            ? 'User does not have access to this agent'
            : 'No pending invitation found for this email',
        },
        { status: 404 },
      );
    }

    // Delete the agent user record
    await db.delete(agentUser).where(eq(agentUser.id, existingAgentUser.id));

    return NextResponse.json<
      ApiResponse<{ removedUser: typeof existingAgentUser }>
    >({
      success: true,
      data: {
        removedUser: existingAgentUser,
      },
    });
  } catch (error) {
    console.error('Error removing user from agent:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error:
            'Invalid request data: Either userId or email must be provided',
        },
        { status: 400 },
      );
    }

    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to remove user from agent',
      },
      { status: 500 },
    );
  }
}
