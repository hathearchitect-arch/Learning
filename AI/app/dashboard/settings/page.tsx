import { redirect } from 'next/navigation';
import { AdminPageHeader } from '@/components/admin-page-header';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/auth';
import { getOrganizationById } from '@/lib/db/queries';
import { auth } from '@/lib/auth';
import { getLogoUrl } from '@/lib/theme-settings';
import { OrganizationSettingsTabs } from '@/components/organization/organization-settings-tabs';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ agentId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session || !session.user.id || !session.session.activeOrganizationId) {
    redirect('/signin');
  }

  //only app level admin can access settings page
  const adminPermission = await auth.api.userHasPermission({
    body: {
      userId: session.user.id,
      permission: {
        organizationConfig: ['update'],
      },
    },
  });

  if (!adminPermission.success) {
    return (
      <>
        <AdminPageHeader title={'Organization Settings'}>
          <Button variant="outline" size="sm" disabled={true}>
            <MoreVertical size="icon" className="size-4" />
          </Button>
        </AdminPageHeader>
        <div className="text-sm font-medium">
          User does not have permission to update organization settings
        </div>
      </>
    );
  }

  const organization = await getOrganizationById(
    session.session.activeOrganizationId,
  );
  const organizationProps = {
    name: organization?.name ? organization.name : null,
    font: organization?.font ? organization.font : null,
    theme: organization?.theme ? organization.theme : null,
    customMetadataFilterConfig: organization?.customMetadataFilterConfig,
    chatHelpUrl: organization?.chatHelpUrl ? organization.chatHelpUrl : null,
    logoS3Key: organization?.logoS3Key ? organization.logoS3Key : null,
  };

  const initialLogoS3Url = await getLogoUrl(
    organizationProps?.logoS3Key ? organizationProps.logoS3Key : '',
  ).catch(() => null);

  return (
    <>
      <AdminPageHeader
        title={'Organization Settings'}
        description="Configure organization settings"
      >
        <Button variant="outline" size="sm" disabled={true}>
          <MoreVertical size="icon" className="size-4" />
        </Button>
      </AdminPageHeader>
      <OrganizationSettingsTabs
        organization={organizationProps}
        organizationId={session.session.activeOrganizationId}
        initialLogoS3Url={initialLogoS3Url}
      />
    </>
  );
}
