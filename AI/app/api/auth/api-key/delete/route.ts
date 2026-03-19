'use server';

import { type NextRequest, NextResponse } from 'next/server';
import { getSession, getActiveOrganization, auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { apikey } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { keyDisableRequestSchema } from './schema';

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

  //check if user has app-level admin permission
  const adminPermission = await auth.api.userHasPermission({
    body: {
      userId: session.user.id,
      permission: {
        apiKey: ['delete'],
      },
    },
  });

  //check if user has org-level permission
  const organizationPermission = await auth.api.hasPermission({
    headers: request.headers,
    body: {
      organizationId: activeOrganization.id,
      permissions: {
        apiKey: ['delete'],
      },
    },
  });

  try {
    const json = await request.json();
    const requestBody = keyDisableRequestSchema.parse(json);

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
      // app-level can disable any key
      const apiKeyUpdateResult = await auth.api.updateApiKey({
        body: {
          userId: apiKeyMetadata.userId,
          keyId: apiKeyMetadata.id,
          enabled: false,
        },
      });
      return NextResponse.json(
        { success: true, apiKeyUpdateResult },
        { status: 200 },
      );
    } else if (organizationPermission.success) {
      // org-level admin can only disable their own keys
      const apiKeyUpdateResult = await auth.api.updateApiKey({
        headers: request.headers,
        body: {
          keyId: apiKeyMetadata.id,
          enabled: false,
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
