'use server';

import { type NextRequest, NextResponse } from 'next/server';
import { auth, getActiveOrganization, getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { agent } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createAgentSchema } from './schema';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

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
        agent: ['create'],
      },
    },
  });

  //check if user has org-level permissions
  const organizationPermission = await auth.api.hasPermission({
    headers: request.headers,
    body: {
      organizationId: activeOrganization.id,
      permissions: {
        agent: ['create'],
      },
    },
  });
  if (!adminPermission.success && !organizationPermission.success) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const body = await request.json();
  const newAgentRequest = createAgentSchema.safeParse(body);

  if (!newAgentRequest.success) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Invalid request body',
      },
      { status: 400 },
    );
  }

  const slug = `${newAgentRequest.data.name}`
    .replace(/\s+/g, '-')
    .toLowerCase();
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  const uniqueSlug = `${slug}-${randomSuffix}`;

  const newAgent = await db
    .insert(agent)
    .values({
      name: newAgentRequest.data.name,
      slug: uniqueSlug,
      description: newAgentRequest.data.description,
      modelId: newAgentRequest.data.modelId,
      organizationId: activeOrganization.id,
      userId: session.user.id,
      temperature: newAgentRequest.data.temperature,
      isActive: newAgentRequest.data.isActive,
      isPublic: newAgentRequest.data.isPublic,
      isDefault: newAgentRequest.data.isDefault,
      monthlyQueryLimit: newAgentRequest.data.monthlyQueryLimit,
      isToolKnowledgebaseEnabled:
        newAgentRequest.data.isToolKnowlegebaseEnabled,
      toolKnowledgebaseSettings: newAgentRequest.data.toolKnowledgebaseSettings,
      isToolQueryDatabaseEnabled:
        newAgentRequest.data.isToolQueryDatabaseEnabled,
      isToolCreateDocumentEnabled:
        newAgentRequest.data.isToolCreateDocumentEnabled,
      isToolUpdateDocumentEnabled:
        newAgentRequest.data.isToolUpdateDocumentEnabled,
      isCustomMetadataFilteringEnabled:
        newAgentRequest.data.isCustomMetadataFilteringEnabled,
    })
    .returning();

  return NextResponse.json({ success: true, data: newAgent[0] });
}

export async function GET(request: NextRequest) {
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
        agent: ['retrieve'],
      },
    },
  });

  //check if user has org-level permissions
  const organizationPermission = await auth.api.hasPermission({
    headers: request.headers,
    body: {
      organizationId: activeOrganization.id,
      permissions: {
        agent: ['retrieve'],
      },
    },
  });
  if (!adminPermission.success && !organizationPermission.success) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const agents = await db.query.agent.findMany({
    where: eq(agent.organizationId, activeOrganization.id),
  });

  return NextResponse.json({ success: true, data: agents });
}
