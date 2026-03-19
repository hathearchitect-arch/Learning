import { NextResponse, type NextRequest } from 'next/server';
import { auth } from './lib/auth';
import { db } from './lib/db';
import { and, eq, inArray } from 'drizzle-orm';
import { member, user } from '@/lib/db/schema';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { searchParams } = request.nextUrl;
  const apiKey = request.headers.get('x-api-key');
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  const publicPaths: Array<string | RegExp> = [
    //    '/signin',
    //    '/signin/**',
    /^\/signin(\/.*)?$/, // Matches /signin and /signin/*
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/confirm-signup',
    '/api/auth/**',
    '/api/healthcheck',
  ];

  function isPublicPath(pathname: string) {
    return publicPaths.some((pubPath) => {
      if (typeof pubPath === 'string') {
        return pathname === pubPath;
      } else {
        return pubPath.test(pathname);
      }
    });
  }

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith('/ping')) {
    return new Response('pong', { status: 200 });
  }

  // check for URL query params used for signin page styling
  // if present, include as theme id cookies
  const searchParamAgentId = searchParams.get('agentId');
  const searchParamOrganizationId = searchParams.get('organizationId');
  if (
    pathname.startsWith('/signin') &&
    (searchParamAgentId || searchParamOrganizationId)
  ) {
    const redirectUrl = new URL('/signin/', request.url);
    const response = NextResponse.redirect(redirectUrl);

    // clear any existing cookies
    response.cookies.delete('agent-theme-id');
    response.cookies.delete('organization-theme-id');

    if (searchParamAgentId) {
      response.cookies.set('agent-theme-id', searchParamAgentId);
    } else if (searchParamOrganizationId) {
      response.cookies.set('organization-theme-id', searchParamOrganizationId);
    }

    return response;
  }

  //ensure only admin users can generate API keys
  if (pathname.startsWith('/api/auth/api-key/create')) {
    try {
      //check that user is either app-level admin or admin of an org
      const sessionUserId = session?.user.id || '';
      const isOrganizationAdmin = await db.query.member.findFirst({
        where: and(
          eq(member.userId, sessionUserId),
          inArray(member.role, ['owner', 'admin']),
        ),
      });
      if (session?.user.role !== 'admin' && !isOrganizationAdmin) {
        return NextResponse.json(
          {
            success: false,
            error: 'Forbidden',
            message: 'User not allowed to generate API keys',
          },
          { status: 400 },
        );
      }
      return NextResponse.next();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bad Request',
          message: 'Unable to generate API key',
        },
        { status: 400 },
      );
    }
  }

   // only app and org level admins can access org endpoints
  if (pathname.startsWith('/api/auth/organization')) {
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 403 },
      );
    }

    const isAppAdmin = await db.query.user.findFirst({
      where: and(eq(user.id, session.user.id), eq(user.role, 'admin')),
    });

    const isOrganizationAdmin = await db.query.member.findFirst({
      where: and(
        eq(member.userId, session.user.id),
        inArray(member.role, ['owner', 'admin']),
      ),
    });

    // ALLOW LISTED ORGANIZATION ENDPOINTS FOR NON-ADMINS
    // these endpoints are allowed for non-admins, so skip the admin check
    const allowListedOrganizationEndpoints = [
      '/api/auth/organization/set-active',
      '/api/auth/organization/accept-invitation',
      '/api/auth/organization/get-invitation',
      '/api/auth/organization/reject-invitation',
      '/api/auth/organization/leave',
      '/api/auth/organization/*/logo',
    ];

    // IF NOT AN APP-LEVEL ADMIN OR AN ORG-LEVEL ADMIN AND THE ENDPOINT IS NOT ALLOW LISTED, BLOCK ACCESS
    if (
      !isAppAdmin &&
      !isOrganizationAdmin &&
      !allowListedOrganizationEndpoints.includes(pathname)
    ) {
      console.log('Unauthorized access attempt', { userId: session.user.id });
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 403 },
      );
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  if (apiKey) {
    const { valid, error, key } = await auth.api.verifyApiKey({
      body: {
        key: apiKey,
      },
    });
    if (valid) {
      return NextResponse.next();
    }
  }

  if (!session && !isPublicPath(pathname)) {
    const redirectUrl = new URL('/signin/', request.url);
    const response = NextResponse.redirect(redirectUrl);

    //extract agent id if in url, add as cookie
    const urlAgentIdMatch = pathname.match(/\/agent\/([^\/]+)/)?.[1];
    if (urlAgentIdMatch !== undefined) {
      response.cookies.set('agent-theme-id', urlAgentIdMatch);
    }

    return response;
  }

  // DASHBOARD PROTECTION
  // protect the dashboard for use by only organization owners, admins, and app-level admins
  if (pathname.startsWith('/dashboard')) {
    // triple check the user has a session
    // if not redirect them to the signin page
    if (!session) {
      return NextResponse.redirect(new URL('/signin', request.url));
    }

    // if the user has no active organization, send them to the organization selection page. at /home
    if (!session.session.activeOrganizationId) {
      return NextResponse.redirect(new URL('/home', request.url));
    }

    // if the user has organizations and are admin or owner, show the dashboard
    // check if user has app-level admin permissions
    const adminPermission = await auth.api.userHasPermission({
      body: {
        userId: session.user.id,
        permission: {
          dashboard: ['retrieve'],
        },
      },
    });

    // check if user has org-level permissions
    const organizationPermission = await auth.api.hasPermission({
      headers: request.headers,
      body: {
        organizationId: session.session.activeOrganizationId,
        permissions: {
          dashboard: ['retrieve'],
        },
      },
    });

    // if these fail, redirect to organizations page to select an organization that they have permission for.
    if (!adminPermission.success && !organizationPermission.success) {
      console.log(
        'redirect to /home from middleware due to lack of permissions',
      );
      return NextResponse.redirect(new URL('/home', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/chat/:id',
    '/api/:path*',
    '/login',
    '/register',

    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
  runtime: 'nodejs',
};
