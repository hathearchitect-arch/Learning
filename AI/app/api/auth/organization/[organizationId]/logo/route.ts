import { getSession, getActiveOrganization } from '@/lib/auth';
import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { getLogoUrl } from '@/lib/theme-settings';
import { getOrganizationById } from '@/lib/db/queries';
import { uploadSchema } from './schema';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Resource } from 'sst';

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
  { params }: { params: Promise<{ organizationId: string }> },
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

  //check if user has app-level admin permission
  const adminPermission = await auth.api.userHasPermission({
    body: {
      userId: session.user.id,
      permission: {
        organizationMembership: ['create'],
      },
    },
  });

  //check if user has org-level admin permission
  const organizationPermission = await auth.api.hasPermission({
    headers: request.headers,
    body: {
      organizationId: activeOrganization.id,
      permissions: {
        organizationMembership: ['create'],
      },
    },
  });
  if (!adminPermission.success && !organizationPermission.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'User does not have permission to add member to organization',
      },
      { status: 401 },
    );
  }

  try {
    const organizationId = (await params).organizationId;

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

    const s3Key = `${activeOrganization.slug}/logo/${timestamp}-${sanitizedFileName}`;

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
    return NextResponse.json(
      { success: false, error: 'Bad Request' },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> },
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

  //check if user has app-level admin permission
  const adminPermission = await auth.api.userHasPermission({
    body: {
      userId: session.user.id,
      permission: {
        organizationMembership: ['create'],
      },
    },
  });

  //check if user has org-level admin permission
  const organizationPermission = await auth.api.hasPermission({
    headers: request.headers,
    body: {
      organizationId: activeOrganization.id,
      permissions: {
        organizationMembership: ['create'],
      },
    },
  });
  if (!adminPermission.success && !organizationPermission.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'User does not have permission to add member to organization',
      },
      { status: 401 },
    );
  }

  try {
    const organizationId = (await params).organizationId;
    const organization = await getOrganizationById(organizationId);
    if (!organization?.logoS3Key) {
      return NextResponse.json(
        { success: false, error: 'Not Found' },
        { status: 404 },
      );
    }
    const logoUrl = await getLogoUrl(organization?.logoS3Key);
    return NextResponse.json(
      { success: true, data: { logoUrl } },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Bad Request' },
      { status: 500 },
    );
  }
}
