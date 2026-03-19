import { type NextRequest, NextResponse } from 'next/server';
import { getSession, getActiveOrganization, auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { keyUpdateRequestSchema } from './schema';
import { apikey } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const session = await getSession();
  const activeOrganization = await getActiveOrganization(request);

  if (!session?.user?.role || !activeOrganization) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Session or active organization is invalid',
      },
      { status: 401 },
    );
  }

  try {
    //check if user has app-level admin permission
    const adminPermission = await auth.api.userHasPermission({
      body: {
        userId: session.user.id,
        permission: {
          apiKey: ['update'],
        },
      },
    });

    //check if user has org-level permission
    const organizationPermission = await auth.api.hasPermission({
      headers: request.headers,
      body: {
        organizationId: activeOrganization.id,
        permissions: {
          apiKey: ['update'],
        },
      },
    });

    const json = await request.json();
    const requestBody = keyUpdateRequestSchema.parse(json);

    const apiKeyMetadata = await db.query.apikey.findFirst({
      where: eq(apikey.id, requestBody.keyId),
    });
    if (!apiKeyMetadata) {
      return NextResponse.json(
        { success: false, error: 'Bad Request', message: 'Invalid API Key id' },
        { status: 403 },
      );
    }

    if (adminPermission.success) {
      // app-level admin can update any keys
      const apiKeyUpdateResult = await auth.api.updateApiKey({
        body: {
          userId: apiKeyMetadata.userId,
          ...requestBody,
        },
      });
      return NextResponse.json(
        { success: true, apiKeyUpdateResult },
        { status: 200 },
      );
    } else if (organizationPermission.success) {
      // org-level admin can only update their own keys
      if (apiKeyMetadata?.userId !== session.user.id) {
        return NextResponse.json(
          {
            success: false,
            error: 'Forbidden',
            message: 'Not authorized to update API key of another user',
          },
          { status: 403 },
        );
      }
      const apiKeyUpdateResult = await auth.api.updateApiKey({
        headers: request.headers,
        body: {
          ...requestBody,
        },
      });
      return NextResponse.json(
        { success: true, apiKeyUpdateResult },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to update API key' },
      { status: 500 },
    );
  }
}
