'use server';

import { type NextRequest, NextResponse } from 'next/server';
import { getActiveOrganization, getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { agent, agentFolder, file } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { auth } from '@/lib/auth';

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

  //check if user has app-level admin permissions
  const adminPermission = await auth.api.userHasPermission({
    body: {
      userId: session.user.id,
      permission: {
        file: ['create'],
      },
    },
  });

  //check if user has org-level permissions
  const organizationPermission = await auth.api.hasPermission({
    headers: request.headers,
    body: {
      organizationId: activeOrganization.id,
      permissions: {
        file: ['create'],
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

    // Verify agent belongs to organization
    const requestedAgent = await db.query.agent.findFirst({
      where: and(
        eq(agent.id, agentId),
        eq(agent.organizationId, activeOrganization.id),
      ),
    });

    if (!requestedAgent) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Agent not found' },
        { status: 404 },
      );
    }

    // Get agent's assigned folders
    const assignedFolders = await db.query.agentFolder.findMany({
      where: eq(agentFolder.agentId, agentId),
    });

    // If no folders are assigned, agent has no access to any files
    let accessibleFiles: any[];
    if (assignedFolders.length === 0) {
      // Agent has no access to files when no folders are assigned
      accessibleFiles = [];
    } else {
      // Agent only has access to files in assigned folders
      const folderIds = assignedFolders.map((af) => af.folderId);

      accessibleFiles = await db.query.file.findMany({
        where: and(
          eq(file.organizationId, activeOrganization.id),
          inArray(file.folderId, folderIds),
        ),
        with: {
          folder: {
            columns: {
              name: true,
            },
          },
        },
      });
    }

    // Transform files to match the expected data table format
    const transformedFiles = accessibleFiles.map((file) => ({
      id: file.id,
      name: file.name,
      type: file.type || 'unknown',
      size: file.size,
      isVectorized: file.isVectorized,
      createdAt: file.createdAt,
      folderName: file.folder?.name || 'Root',
      s3Key: file.s3Key,
    }));

    return NextResponse.json<ApiResponse<typeof transformedFiles>>({
      success: true,
      data: transformedFiles,
    });
  } catch (error) {
    console.error('Error fetching agent accessible documents:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
