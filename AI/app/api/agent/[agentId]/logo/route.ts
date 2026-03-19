'use server';

import { type NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Resource } from 'sst';
import { getSession } from '@/lib/auth';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { agent } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const awsRegion = process.env.AWS_REGION;

const s3Client = new S3Client({
  region: awsRegion,
});

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
  if (!session || !session.user.id || !session.session.activeOrganizationId) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const { agentId } = await params;
  if (!agentId) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Agent ID is required' },
      { status: 400 },
    );
  }

  try {
    // Get the organization details
    const activeOrganization = await auth.api.getFullOrganization({
      headers: await headers(),
    });

    if (!activeOrganization) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Organization not found' },
        { status: 404 },
      );
    }

    // Get s3Key from query params
    const { searchParams } = new URL(request.url);
    const s3Key = searchParams.get('s3Key');

    if (!s3Key) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'S3 key is required' },
        { status: 400 },
      );
    }

    // Verify agent ownership
    const requestedAgent = await db.query.agent.findFirst({
      where: and(
        eq(agent.id, agentId),
        eq(agent.organizationId, session.session.activeOrganizationId),
      ),
    });

    if (!requestedAgent) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Agent not found or unauthorized' },
        { status: 404 },
      );
    }

    // Verify the s3Key belongs to this agent
    if (requestedAgent.logoS3Key !== s3Key) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Invalid S3 key' },
        { status: 403 },
      );
    }

    const command = new GetObjectCommand({
      Bucket: Resource.AppBucket.name,
      Key: s3Key,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 60 * 60, // 1 hour
    });

    return NextResponse.json<ApiResponse<{ url: string }>>({
      success: true,
      data: { url: presignedUrl },
    });
  } catch (error) {
    console.error('Error getting logo URL:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to get logo URL' },
      { status: 500 },
    );
  }
}
