'use server';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db'; // adjust path as needed
import { agentSuggestedAction } from '@/lib/db/schema'; // adjust path as needed
import { eq, and } from 'drizzle-orm';
import { auth, getSession, getActiveOrganization } from '@/lib/auth'; // adjust path as needed

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

const postSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  action: z.string().min(1),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> },
) {
  try {
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

    const { agentId } = await params;
    const actions = await db
      .select()
      .from(agentSuggestedAction)
      .where(and(eq(agentSuggestedAction.agentId, agentId)));

    return NextResponse.json<ApiResponse<typeof actions>>({
      success: true,
      data: actions,
    });
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to fetch suggested actions' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> },
) {
  try {
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

    const { agentId } = await params;
    const body = await request.json();
    const parsed = postSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Invalid input' },
        { status: 400 },
      );
    }

    //check if user has app-level admin permissions
    const adminPermission = await auth.api.userHasPermission({
      body: {
        userId: session.user.id,
        permission: {
          agent: ['update'],
        },
      },
    });

    //check if user has org-level permissions
    const organizationPermission = await auth.api.hasPermission({
      headers: request.headers,
      body: {
        organizationId: activeOrganization.id,
        permissions: {
          agent: ['update'],
        },
      },
    });

    if (adminPermission.success || organizationPermission.success) {
      const [action] = await db
        .insert(agentSuggestedAction)
        .values({
          agentId: agentId,
          title: parsed.data.title,
          description: parsed.data.description,
          action: parsed.data.action,
        })
        .returning();

      return NextResponse.json<ApiResponse<typeof action>>({
        success: true,
        data: action,
      });
    } else {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to create suggested action' },
      { status: 500 },
    );
  }
}
