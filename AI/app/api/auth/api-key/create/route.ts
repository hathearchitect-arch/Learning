'use server';

import { type NextRequest, NextResponse } from 'next/server';
import { getSession, auth } from '@/lib/auth';
import { createApiKeySchema } from './schema';
import { db } from '@/lib/db';
import { and, eq } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  const session = await getSession();

  // not checking for active organization to allow first-time API key creation for app-level admins
  if (!session?.user?.role) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Session or active organization is invalid',
      },
      { status: 401 },
    );
  }

  //check if user has app-level admin permission to create api key
  const adminPermission = await auth.api.userHasPermission({
    body: {
      userId: session.user.id,
      permission: {
        apiKey: ['create'],
      },
    },
  });

  //check if user has org-level admin role in at least 1 organization
  const organizationPermission = await db.query.member.findFirst({
    where: and(
      eq(schema.member.userId, session.user.id),
      eq(schema.member.role, 'admin'),
    ),
  });
  if (!adminPermission.success && !organizationPermission) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    const json = await request.json();
    const createApiKeyRequest = createApiKeySchema.parse(json);
    const apiKey = await auth.api.createApiKey({
      body: {
        name: createApiKeyRequest.name,
        userId: session.user.id,
        expiresIn: createApiKeyRequest.expiresIn,
        remaining: null,
        metadata: createApiKeyRequest.metadata,
      },
    });
    return NextResponse.json({ success: true, apiKey }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Bad Request' },
      { status: 500 },
    );
  }
}
