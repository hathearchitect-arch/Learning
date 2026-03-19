'use server';

import { type NextRequest, NextResponse } from 'next/server';
import { createFolderSchema } from './schema';
import { getSession, auth, getActiveOrganization } from '@/lib/auth';
import { db } from '@/lib/db';
import { folder, file } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

async function getBreadcrumbs(
  folderId: string | null,
  organizationId: string,
): Promise<any[]> {
  if (!folderId) return [];

  const breadcrumbs = [];
  let currentFolderId = folderId;

  while (currentFolderId) {
    const folderData = await db
      .select({
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
      })
      .from(folder)
      .where(
        and(
          eq(folder.organizationId, organizationId),
          eq(folder.id, currentFolderId),
        ),
      )
      .limit(1);

    if (folderData.length === 0) break;

    const currentFolder = folderData[0];
    breadcrumbs.unshift(currentFolder);
    if (!currentFolder.parentId) break; // Stop if we reach the root folder
    currentFolderId = currentFolder?.parentId;
  }

  return breadcrumbs;
}

type Params = {
  params: Promise<{ folderId: string[] | string | undefined }>;
};

export async function GET(request: NextRequest, { params }: Params) {
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
        folder: ['retrieve'],
      },
    },
  });

  //check if user has org-level permissions
  const organizationPermission = await auth.api.hasPermission({
    headers: request.headers,
    body: {
      organizationId: activeOrganization.id,
      permissions: {
        folder: ['retrieve'],
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
    // get the folderid from the query params
    let { folderId } = await params;
    folderId = folderId?.[0] || undefined;

    // Check if this is a request for the full tree structure
    const url = new URL(request.url);
    const isTreeRequest = url.searchParams.get('tree') === 'true';

    if (isTreeRequest) {
      // Return full folder tree for agent assignment feature
      const allFolders = await db.query.folder.findMany({
        where: eq(folder.organizationId, activeOrganization.id),
        with: {
          files: {
            columns: {
              id: true,
              name: true,
              size: true,
            },
          },
          childFolders: true,
        },
      });

      // Build hierarchical structure
      const buildFolderTree = (parentId: string | null = null): any[] => {
        return allFolders
          .filter((f) => f.parentId === parentId)
          .map((folder) => ({
            ...folder,
            childFolders: buildFolderTree(folder.id),
          }));
      };

      const folderTree = buildFolderTree();

      return NextResponse.json<ApiResponse<any>>({
        success: true,
        data: {
          childFolders: folderTree,
        },
      });
    }

    const isRoot = !folderId;

    // If folderId is not provided, we are fetching the root folder which does not exist in the database
    let currentFolder: any | undefined;
    let breadcrumbs: any[] = [];
    if (isRoot && !folderId) {
      const rootFiles = await db.query.file.findMany({
        columns: {
          id: true,
          name: true,
          type: true,
          isVectorized: true,
          size: true,
          updatedAt: true,
        },
        where: and(
          eq(file.organizationId, activeOrganization.id),
          isNull(file.folderId), // Fetch files that are not in any folder
        ),
      });

      const rootChildFolders = await db.query.folder.findMany({
        columns: {
          id: true,
          name: true,
        },
        where: and(
          eq(folder.organizationId, activeOrganization.id),
          isNull(folder.parentId), // Fetch folders that are at the root level
        ),
      });
      currentFolder = {
        id: null, // Placeholder ID for root folder
        name: 'home',
        parentFolder: null,
        files: rootFiles || [],
        childFolders: rootChildFolders || [],
        createdAt: new Date(),
      };
      breadcrumbs = await getBreadcrumbs(null, activeOrganization.id);
    } else {
      currentFolder = await db.query.folder.findFirst({
        columns: {
          id: true,
          name: true,
          createdAt: true,
        },
        where: and(
          eq(folder.id, folderId as string),
          eq(folder.organizationId, activeOrganization.id),
        ),
        with: {
          files: {
            columns: {
              id: true,
              name: true,
              type: true,
              isVectorized: true,
              size: true,
              updatedAt: true,
            },
          },
          parentFolder: {
            columns: {
              id: true,
              name: true,
            },
          },
          childFolders: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });
      breadcrumbs = await getBreadcrumbs(
        currentFolder?.id || null,
        activeOrganization.id,
      );
    }
    return NextResponse.json(
      {
        data: {
          ...currentFolder,
          breadcrumbs: breadcrumbs,
        },
      },

      { status: 200 },
    );
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch folders',
      },
      { status: 500 },
    );
  }
}

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

  //check if user has app-level admin permissions
  const adminPermission = await auth.api.userHasPermission({
    body: {
      userId: session.user.id,
      permission: {
        folder: ['update'],
      },
    },
  });

  //check if user has org-level permissions
  const organizationPermission = await auth.api.hasPermission({
    headers: request.headers,
    body: {
      organizationId: activeOrganization.id,
      permissions: {
        folder: ['update'],
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
    const body = await request.json();
    const parsed = createFolderSchema.safeParse(body);

    if (!parsed.success) {
      console.error('Invalid request body:', parsed.error.errors);
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: 'Invalid request body',
        },
        { status: 400 },
      );
    }

    const { name, parentFolderId } = parsed.data;

    // check that parent folder belongs within activeOrganization
    if (parentFolderId) {
      const parentFolderMetadata = await db
        .select()
        .from(folder)
        .where(
          and(
            eq(folder.id, parentFolderId),
            eq(folder.organizationId, activeOrganization.id),
          ),
        );
      if (parentFolderMetadata.length === 0) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error:
              'Forbidden, parent folder ID does not belong to organization',
          },
          { status: 403 },
        );
      }
    }

    // For folders, we don't need to upload anything to S3, just create a resource entry
    const newFolderData = {
      organizationId: activeOrganization.id,
      userId: session.user.id,
      name: name,
      parentId: parentFolderId,
    };
    console.log('Creating new folder:', newFolderData);
    const newFolder = await db.insert(folder).values(newFolderData).returning();
    return NextResponse.json<ApiResponse<{ resource: typeof newFolder }>>({
      success: true,
      data: { resource: newFolder },
    });
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to create folder',
      },
      { status: 500 },
    );
  }
}

// Delete Folder route

export async function DELETE(request: NextRequest, { params }: Params) {
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
        folder: ['delete'],
      },
    },
  });

  //check if user has org-level permissions
  const organizationPermission = await auth.api.hasPermission({
    headers: request.headers,
    body: {
      organizationId: activeOrganization.id,
      permissions: {
        folder: ['delete'],
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
    let { folderId } = await params;
    folderId = folderId?.[0] || undefined;
    if (!folderId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Folder ID is required' },
        { status: 400 },
      );
    }

    // check to see if the folder exists and has files
    // if it has files, we cannot delete it
    const folderToDelete = await db.query.folder.findFirst({
      where: and(
        eq(folder.id, folderId),
        eq(folder.organizationId, activeOrganization.id),
      ),
      with: {
        files: {
          columns: {
            id: true,
          },
        },
        childFolders: {
          columns: {
            id: true,
          },
        },
      },
    });

    if (!folderToDelete) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Folder not found' },
        { status: 404 },
      );
    }
    if (
      folderToDelete.files.length > 0 ||
      folderToDelete.childFolders.length > 0
    ) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error:
            'Folder cannot be deleted because it contains files or subfolders',
        },
        { status: 400 },
      );
    }

    // Delete the folder from the database
    const deletedFolder = await db
      .delete(folder)
      .where(
        and(
          eq(folder.id, folderId),
          eq(folder.organizationId, activeOrganization.id),
        ),
      )
      .returning();

    if (deletedFolder.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Folder not found' },
        { status: 404 },
      );
    }

    return NextResponse.json<ApiResponse<{ resource: typeof deletedFolder }>>({
      success: true,
      data: { resource: deletedFolder },
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to delete folder',
      },
      { status: 500 },
    );
  }
}
