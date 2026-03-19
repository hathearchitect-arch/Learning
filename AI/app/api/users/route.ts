import { NextResponse, type NextRequest } from 'next/server';
import { getSession, getActiveOrganization } from '@/lib/auth';
import { db } from '@/lib/db';
import { agentUser, member, invitation } from '@/lib/db/schema';
import { eq, and, isNull, or } from 'drizzle-orm';
import { auth } from '@/lib/auth';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type UserItemSchema = {
  id: string; // member ID or invitation ID
  userId?: string; // user ID (only for members)
  name: string;
  email: string;
  image?: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'pending' | 'rejected';
  invitationId?: string; // invitation ID for pending invitations
  agentAccess?: Array<{
    id: string;
    name: string;
    isActive: boolean;
    avatar?: string;
    logoS3Key?: string;
    status: 'active' | 'pending' | 'rejected';
  }>;
};

export async function GET(request: NextRequest) {
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

  //check if user has app-level admin permissions
  const adminPermission = await auth.api.userHasPermission({
    body: {
      userId: session.user.id,
      permission: {
        users: ['create'],
      },
    },
  });

  //check if user has org-level permissions
  const organizationPermission = await auth.api.hasPermission({
    headers: request.headers,
    body: {
      organizationId: activeOrganization.id,
      permissions: {
        users: ['create'],
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
    // 1. Get organization members using Drizzle ORM
    const members = await db.query.member.findMany({
      where: eq(member.organizationId, activeOrganization.id),
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
      orderBy: (member, { desc }) => [desc(member.createdAt)],
      limit: 100,
    });

    // 2. Get pending and rejected invitations using Drizzle ORM
    const invitations = await db.query.invitation.findMany({
      where: and(
        eq(invitation.organizationId, activeOrganization.id),
        or(eq(invitation.status, 'pending'), eq(invitation.status, 'rejected')),
      ),
      columns: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });

    // 3. Get pending agent access directly from database (users who haven't signed up yet)
    const pendingAgentAccessRecords = await db.query.agentUser.findMany({
      where: and(
        eq(agentUser.inviteStatus, 'pending'),
        isNull(agentUser.userId), // User hasn't signed up yet
      ),
      with: {
        agent: {
          columns: {
            id: true,
            name: true,
            organizationId: true,
            avatar: true,
            logoS3Key: true,
          },
        },
      },
    });

    // 4. Get all agent access for existing users in this organization
    const allAgentAccessRecords = await db.query.agentUser.findMany({
      where: eq(agentUser.inviteStatus, 'accepted'),
      with: {
        agent: {
          columns: {
            id: true,
            name: true,
            organizationId: true,
            avatar: true,
            logoS3Key: true,
          },
        },
        user: {
          columns: {
            id: true,
            email: true,
          },
        },
      },
    });

    // Filter agent access by current organization
    const filteredAgentAccess = allAgentAccessRecords.filter(
      (record) => record.agent.organizationId === activeOrganization.id,
    );

    // Group agent access by user
    const userAgentAccess = filteredAgentAccess.reduce(
      (acc, record) => {
        if (!record.user) return acc;

        const userId = record.user.id;
        if (!acc[userId]) {
          acc[userId] = [];
        }
        acc[userId].push({
          id: record.agent.id,
          name: record.agent.name,
          isActive: record.isActive,
          avatar: record.agent.avatar || undefined,
          logoS3Key: record.agent.logoS3Key || undefined,
        });
        return acc;
      },
      {} as Record<
        string,
        Array<{
          id: string;
          name: string;
          isActive: boolean;
          avatar?: string;
          logoS3Key?: string;
        }>
      >,
    );

    // Filter by organization and group by email for pending access
    const filteredPendingAccess = pendingAgentAccessRecords.filter(
      (record) => record.agent.organizationId === activeOrganization.id,
    );

    const pendingAgentAccess = filteredPendingAccess.reduce(
      (acc, record) => {
        const email = record.inviteEmail;
        if (!email) return acc;

        if (!acc[email]) {
          acc[email] = {
            email,
            agents: [],
            createdAt: record.createdAt,
          };
        }
        acc[email].agents.push({
          id: record.agent.id,
          name: record.agent.name,
          isActive: record.isActive,
          avatar: record.agent.avatar || undefined,
          logoS3Key: record.agent.logoS3Key || undefined,
        });
        return acc;
      },
      {} as Record<
        string,
        {
          email: string;
          agents: Array<{
            id: string;
            name: string;
            isActive: boolean;
            avatar?: string;
            logoS3Key?: string;
          }>;
          createdAt: Date;
        }
      >,
    );

    const pendingAgentAccessArray = Object.values(pendingAgentAccess);

    // 5. Transform and combine all data

    // Active organization members
    const transformedMembers: UserItemSchema[] = members.map((member) => ({
      id: member.id, // member ID
      userId: member.userId, // user ID
      name: member.user.name,
      image: member.user.image || undefined,
      email: member.user.email,
      role: member.role as 'owner' | 'admin' | 'member',
      status: 'active' as const,
      agentAccess: (userAgentAccess[member.userId] || []).map((agent) => ({
        ...agent,
        status: 'active' as const,
      })),
    }));

    // Pending and rejected invitations with agent access info
    const pendingInvitations: UserItemSchema[] = invitations.map(
      (invitation) => {
        // Check if this email also has pending agent access
        const agentAccess = pendingAgentAccessArray.find(
          (access: any) => access.email === invitation.email,
        );

        return {
          id: invitation.id, // invitation ID
          name: invitation.email, // use email as name for pending invitations
          email: invitation.email,
          role: invitation.role as 'owner' | 'admin' | 'member',
          status:
            invitation.status === 'pending'
              ? ('pending' as const)
              : ('rejected' as const),
          invitationId: invitation.id,
          agentAccess:
            agentAccess?.agents?.map((agent: any) => ({
              ...agent,
              status: 'pending' as const,
            })) || [],
        };
      },
    );

    // Users with only pending agent access (no organization invitation)
    const pendingAgentUsers: UserItemSchema[] = pendingAgentAccessArray
      .filter((agentAccess: any) => {
        // Only include if they don't already have an organization invitation
        return !pendingInvitations.some(
          (inv) => inv.email === agentAccess.email,
        );
      })
      .map((agentAccess: any) => ({
        id: `agent-access-${agentAccess.email}`, // unique ID for pending agent access
        name: agentAccess.email, // use email as name
        email: agentAccess.email,
        role: 'member' as const, // they will be members when they sign up
        status: 'pending' as const,
        agentAccess:
          agentAccess.agents?.map((agent: any) => ({
            ...agent,
            status: 'pending' as const,
          })) || [],
      }));

    // Combine all users
    const users: UserItemSchema[] = [
      ...transformedMembers,
      ...pendingInvitations,
      ...pendingAgentUsers,
    ];

    return NextResponse.json<ApiResponse<UserItemSchema[]>>({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to fetch users data',
      },
      { status: 500 },
    );
  }
}
