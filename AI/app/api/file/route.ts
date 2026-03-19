'use server';

import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Resource } from 'sst';
import { getSession, auth, getActiveOrganization } from '@/lib/auth';
import { db } from '@/lib/db';
import { file } from '@/lib/db/schema';
import { getUploadUrlSchema } from './schema';
import { eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

const awsRegion = process.env.AWS_REGION;

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

const s3Client = new S3Client({
  region: awsRegion,
});

export async function POST(request: Request) {
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
    const body = await request.json();
    const parsed = getUploadUrlSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Invalid request body' },
        { status: 400 },
      );
    }

    // sanitize the file name to remove invalid characters and replace spaces with dashes
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedFileName = parsed.data.name
      .replace(/[^a-zA-Z0-9-_\.]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();

    const { name, folderId, metadata } = parsed.data;
    const bucket = Resource.KnowledgebaseDocumentsBucket.name;
    const key = `${activeOrganization?.slug}/files/uploads/${folderId ? `${folderId}/` : ''}${timestamp}-${sanitizedFileName}`;

    // check that folder id is part of organization, if present
    if (folderId) {
      const folderMetadata = await db.query.folder.findFirst({
        where: eq(schema.folder.id, folderId),
      });
      if (activeOrganization.id !== folderMetadata?.organizationId) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: 'Folder ID invalid, not part of organization',
          },
          { status: 403 },
        );
      }
    }

    type NewFile = typeof file.$inferInsert;
    const newFileData: NewFile = {
      folderId: folderId,
      userId: session.user.id,
      name: name,
      type: name.split('.').pop() || null,
      s3Key: key,
      organizationId: activeOrganization.id,
    };
    const res = await db.insert(file).values(newFileData).returning();

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Metadata: metadata,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 60 * 5,
    });

    return NextResponse.json<ApiResponse<{ presignedUrl: string }>>({
      success: true,
      data: { presignedUrl: presignedUrl },
    });
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to generate presigned URL',
      },
      { status: 500 },
    );
  }
}
