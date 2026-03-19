'use server';

import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { member, user, invitation } from '@/lib/db/schema';
import { eq, not } from 'drizzle-orm';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.user) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Unauthorized',
      },
      { status: 401 },
    );
  }

  try {
    // Get user's assigned agents
    const userData = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      with: {
        agents: {
          columns: {
            id: true,
            isActive: true,
          },
          with: {
            agent: {
              columns: {
                id: true,
                name: true,
                description: true,
                avatar: true,
                slug: true,
              },
              with: {
                organization: {
                  columns: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        organizations: {
          columns: {
            id: true,
            role: true,
          },
          where: not(eq(member.role, 'member')),
          with: {
            organization: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
        },
        invitations: {
          columns: {
            id: true,
            email: true,
            status: true,
            role: true,
            expiresAt: true,
          },
          with: {
            organization: {
              columns: {
                id: true,
                name: true,
                slug: true,
              },
            },
            inviter: {
              columns: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          where: eq(invitation.status, 'pending'),
        },
      },
    });

    return NextResponse.json<ApiResponse<typeof userData>>({
      success: true,
      data: userData,
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to fetch user data',
      },
      { status: 500 },
    );
  }
}
