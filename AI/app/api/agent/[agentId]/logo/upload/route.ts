'use server';

import { type NextRequest, NextResponse } from 'next/server';
import { uploadSchema } from './schema';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Resource } from 'sst';
import { auth, getSession, getActiveOrganization } from '@/lib/auth';
import { db } from '@/lib/db';
import { agent } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const awsRegion = process.env.AWS_REGION;

const s3Client = new S3Client({
  region: awsRegion,
});

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function POST(
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
  if (!adminPermission.success && !organizationPermission.success) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    const { agentId } = await params;
    const requestedAgent = await db.query.agent.findFirst({
      where: eq(agent.id, agentId),
    });
    if (!agentId || !requestedAgent) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Valid Agent ID required' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const parsed = uploadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Invalid request body' },
        { status: 400 },
      );
    }
    const { fileName, fileType } = parsed.data;

    // Generate S3 key with organization slug and agent slug
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedFileName = fileName
      .replace(/[^a-zA-Z0-9-_\.]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();

    const s3Key = `${activeOrganization.slug}/agents/${requestedAgent.slug}/logo/${timestamp}-${sanitizedFileName}`;

    const command = new PutObjectCommand({
      Bucket: Resource.AppBucket.name,
      Key: s3Key,
      ContentType: fileType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 60 * 10, // 10 minutes
    });

    return NextResponse.json<
      ApiResponse<{ presignedUrl: string; s3Key: string }>
    >({
      success: true,
      data: { presignedUrl, s3Key },
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to generate presigned URL' },
      { status: 500 },
    );
  }
}
