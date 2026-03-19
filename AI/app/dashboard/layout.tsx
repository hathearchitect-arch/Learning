import { NavSidebar } from '@/components/nav/nav-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { SiteHeader } from '@/components/site-header';
import { ThemeProvider } from 'next-themes';
import { getSession, auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { organization } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const experimental_ppr = true;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    return redirect('/signin');
  }

  // if the user has no active organization, send them to the organization selection page.
  // if the user has no organizations, but has invites, the organizations page will show them pending invitations
  // if the user has no invitations or organizations, they won't be able to progress. give them the ability to contact us for help getting started
  // or in the future, sign up for an organization trial or paid plan.
  if (!session.session.activeOrganizationId) {
    return redirect('/home');
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
    headers: await headers(),
    body: {
      organizationId: session.session.activeOrganizationId,
      permissions: {
        dashboard: ['retrieve'],
      },
    },
  });

  // if these fail, redirect to organizations page to select an organization that they have permission for.
  if (!adminPermission.success && !organizationPermission.success) {
    return redirect('/home');
  }

  // check if user has right to edit organization config
  const adminOrganizationConfigPermission = await auth.api.userHasPermission({
    body: {
      userId: session.user.id,
      permission: {
        organizationConfig: ['update'],
      },
    },
  });

  // check if user has org-level permissions
  const organizationConfigPermission = await auth.api.hasPermission({
    headers: await headers(),
    body: {
      organizationId: session.session.activeOrganizationId,
      permissions: {
        organizationConfig: ['update'],
      },
    },
  });

  // get the help link to pass to navbar
  const organizationObject = await db.query.organization.findFirst({
    where: eq(organization.id, session.session.activeOrganizationId),
  });

  return (
    <>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <SidebarProvider>
          <NavSidebar
            variant="inset"
            hasOrganizationConfigPermissions={
              adminOrganizationConfigPermission.success ||
              organizationConfigPermission.success
            }
            organizationHelpLink={organizationObject?.chatHelpUrl || null}
          />
          <SidebarInset>
            <SiteHeader />
            <div className="flex flex-1 flex-col">
              <div className="@container/main flex flex-1 flex-col gap-2 p-6">
                {children}
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ThemeProvider>
    </>
  );
}
