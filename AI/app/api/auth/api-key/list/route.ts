import { type NextRequest, NextResponse } from 'next/server';
import { getSession, getActiveOrganization, auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
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
    //check if user has app-level admin permission to view all history
    const adminPermission = await auth.api.userHasPermission({
      body: {
        userId: session.user.id,
        permission: {
          apiKey: ['retrieve'],
        },
      },
    });

    //check if user has org-level permission to view all history
    const organizationPermission = await auth.api.hasPermission({
      headers: request.headers,
      body: {
        organizationId: activeOrganization.id,
        permissions: {
          apiKey: ['retrieve'],
        },
      },
    });

    // app-level admin can see all keys in all orgs
    if (adminPermission.success) {
      const keyList = await db.query.apikey.findMany();
      return NextResponse.json({ success: true, keyList }, { status: 200 });
    } else if (organizationPermission.success) {
      // org-level admin can only see their own keys (normal better-auth /api-key/list endpoint behavior)
      const keyList = await auth.api.listApiKeys({
        headers: request.headers,
      });
      return NextResponse.json({ success: true, keyList }, { status: 200 });
    } else {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve list of API keys' },
      { status: 500 },
    );
  }
}
