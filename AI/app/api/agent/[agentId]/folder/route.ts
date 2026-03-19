'use server';

import { type NextRequest, NextResponse } from 'next/server';
import { getActiveOrganization, getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { agent, agentFolder, folder } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { manageFoldersSchema } from './schema';
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
      with: {
        folder: true,
      },
    });

    // Get all folders to build paths
    const allFolders = await db.query.folder.findMany({
      where: eq(folder.organizationId, activeOrganization.id),
    });

    // Build folder path by traversing up the parent chain
    const buildFolderPath = (targetFolder: any): string => {
      const path: string[] = [];
      let currentFolder = targetFolder;

      while (currentFolder) {
        path.unshift(currentFolder.name);
        if (currentFolder.parentId) {
          currentFolder = allFolders.find(
            (f) => f.id === currentFolder.parentId,
          );
        } else {
          currentFolder = null;
        }
      }

      return `/${path.join('/')}`;
    };

    // Add paths to assigned folders
    const assignedFoldersWithPaths = assignedFolders.map((af) => ({
      ...af,
      folder: {
        ...af.folder,
        path: buildFolderPath(af.folder),
      },
    }));

    return NextResponse.json<ApiResponse<typeof assignedFoldersWithPaths>>({
      success: true,
      data: assignedFoldersWithPaths,
    });
  } catch (error) {
    console.error('Error fetching agent folders:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
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
    const body = await request.json();
    const parsed = manageFoldersSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Invalid request data' },
        { status: 400 },
      );
    }

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

    // Verify all folders belong to the organization
    if (parsed.data.folderIds.length > 0) {
      const organizationFolders = await db.query.folder.findMany({
        where: and(
          inArray(folder.id, parsed.data.folderIds),
          eq(folder.organizationId, activeOrganization.id),
        ),
      });

      if (organizationFolders.length !== parsed.data.folderIds.length) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: 'One or more folders not found in organization',
          },
          { status: 400 },
        );
      }
    }

    // Delete existing agent folder associations
    await db.delete(agentFolder).where(eq(agentFolder.agentId, agentId));

    // Add new folder associations
    if (parsed.data.folderIds.length > 0) {
      const newAssociations = parsed.data.folderIds.map((folderId) => ({
        agentId,
        folderId,
      }));

      await db.insert(agentFolder).values(newAssociations);
    }

    return NextResponse.json<ApiResponse<{ message: string }>>({
      success: true,
      data: { message: 'Agent folders updated successfully' },
    });
  } catch (error) {
    console.error('Error updating agent folders:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
