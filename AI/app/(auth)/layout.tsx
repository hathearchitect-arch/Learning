import { ThemeProvider } from 'next-themes';
import { ThemeCustom } from '@/components/theme-custom';
import Script from 'next/script';
import { getAgentTheme, getOrganizationTheme } from '@/lib/theme-settings';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { LayoutLogoUrlProvider } from '../layout-logo-context';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ agentId: string }>;
}): Promise<Metadata> {
  try {
    const agentThemeIdCookie = (await cookies()).get('agent-theme-id');
    const organizationThemeIdCookie = (await cookies()).get(
      'organization-theme-id',
    );

    const agentTheme = await getAgentTheme(
      agentThemeIdCookie?.value || '',
    ).catch(() => null);
    const organizationTheme = await getOrganizationTheme(
      organizationThemeIdCookie?.value || '',
    ).catch(() => null);

    const logoUrl =
      agentTheme?.agentLogoUrl ||
      organizationTheme?.organizationLogoUrl ||
      null;

    return {
      title: agentTheme?.name || organizationTheme?.name || 'Caddie AI',
      description: '',
      icons: logoUrl
        ? {
            icon: logoUrl,
            shortcut: logoUrl,
            apple: logoUrl,
          }
        : undefined,
    };
  } catch (error) {
    return {
      title: 'Caddie AI',
      description: 'Custom AI Agents, powered by Caddie AI',
    };
  }
}

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const agentThemeIdCookie = (await cookies()).get('agent-theme-id');
  const organizationThemeIdCookie = (await cookies()).get(
    'organization-theme-id',
  );

  const agentId = agentThemeIdCookie?.value || '';
  const organizationId = organizationThemeIdCookie?.value || '';
  const agentTheme = await getAgentTheme(agentId).catch(() => null);
  const organizationTheme = await getOrganizationTheme(organizationId).catch(
    () => null,
  );

  if (agentTheme || organizationTheme) {
    const layoutLogoData = {
      logoUrl:
        agentTheme?.agentLogoUrl ||
        organizationTheme?.organizationLogoUrl ||
        null,
      logoAlt: agentTheme?.name || organizationTheme?.name || 'CADDIE.AI Logo',
    };
    return (
      <>
        <Script
          src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
          strategy="beforeInteractive"
        />
        <ThemeCustom
          theme={agentTheme?.theme || organizationTheme?.theme}
          themeAttributes={agentTheme?.themeAttributes}
          fonts={agentTheme?.fonts || organizationTheme?.fonts}
        >
          <LayoutLogoUrlProvider logoData={layoutLogoData}>
            {children}
          </LayoutLogoUrlProvider>
        </ThemeCustom>
      </>
    );
  }
  const layoutLogoData = {
    logoUrl: null,
    logoAlt: 'CADDIE.AI Logo',
  };

  return (
    <>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <LayoutLogoUrlProvider logoData={layoutLogoData}>
          {children}
        </LayoutLogoUrlProvider>
      </ThemeProvider>
    </>
  );
}
