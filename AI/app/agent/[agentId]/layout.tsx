import { AppSidebar } from '@/components/sidebar/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { getSession } from '@/lib/auth';
import { ThemeCustom } from '@/components/theme-custom';
import { caddieApi } from '@/lib/api';
import { redirect } from 'next/navigation';
import Script from 'next/script';
import { getAgentTheme, getLogoUrl } from '@/lib/theme-settings';
import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { organization } from '@/lib/db/schema';

export const experimental_ppr = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ agentId: string }>;
}): Promise<Metadata> {
  const { agentId } = await params;

  try {
    // Fetch agent data to get name and description
    const { data: agent } = await caddieApi.get(`/api/agent/${agentId}`);

    // Get agent logo URL if logoS3Key exists
    const agentLogoUrl = agent?.logoS3Key
      ? await getLogoUrl(agent.logoS3Key)
      : null;

    return {
      title: agent?.name || 'Agent',
      description: agent?.description || 'AI Agent powered by Caddie',
      icons: agentLogoUrl
        ? {
            icon: agentLogoUrl,
            shortcut: agentLogoUrl,
            apple: agentLogoUrl,
          }
        : undefined,
    };
  } catch (error) {
    // Fallback metadata if agent fetch fails
    return {
      title: 'Agent',
      description: 'AI Agent powered by Caddie',
    };
  }
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ agentId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect('/signin');
  }

  const { agentId } = await params;
  const { data: agent } = await caddieApi.get(`/api/agent/${agentId}`);
  const agentTheme = await getAgentTheme(agentId);
  const organizationObject = await db.query.organization.findFirst({
    where: eq(organization.id, session.session.activeOrganizationId || ''),
  });

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <ThemeCustom
        theme={agentTheme?.theme}
        themeAttributes={agentTheme?.themeAttributes}
        fonts={agentTheme?.fonts}
      >
        <SidebarProvider defaultOpen={false}>
          <AppSidebar
            user={session?.user}
            agentId={agent?.id}
            agentName={agent?.name}
            agentLogoUrl={agentTheme?.agentLogoUrl}
            helpLinkUrl={organizationObject?.chatHelpUrl || null}
          />
          <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
      </ThemeCustom>
    </>
  );
}
