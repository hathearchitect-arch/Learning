import { redirect } from 'next/navigation';
import { OrganizationSelector } from '@/components/organization/organization-selector';
import { InvitationList } from '@/components/invitation-list';
import { UserProfileCard } from '@/components/user/user-profile-card';
import { AvailableAgentsDropdown } from '@/components/agent-available-agents-dropdown';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { caddieApi } from '@/lib/api';
import { CreateDefaultOrganizationButton } from '@/components/organization/organization-create-default-button';

// Types for the API response
type UserApiResponse = {
  id: string;
  agents: Array<{
    id: string;
    isActive: boolean;
    agent: {
      id: string;
      name: string;
      description: string | null;
      avatar: string | null;
      slug: string;
      organization: {
        id: string;
        name: string;
      };
    };
  }>;
  organizations: Array<{
    id: string;
    role: string;
    organization: {
      id: string;
      name: string;
    };
  }>;
  invitations: Array<{
    id: string;
    email: string;
    status: string;
    role: string | null;
    expiresAt: string;
    organization: {
      id: string;
      name: string;
      slug: string;
    };
    inviter: {
      id: string;
      name: string | null;
      email: string;
    };
  }>;
};

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/signin');
  }

  const userInfoResponse = await caddieApi.get('/api/user');

  if (!userInfoResponse.success || !userInfoResponse.data) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">Failed to load user information</p>
        </div>
      </div>
    );
  }

  const userInfo: UserApiResponse = userInfoResponse.data;

  // Pass user data to components
  const userData = {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  };

  // Transform organizations data for the OrganizationSelector component
  const organizations =
    userInfo.organizations?.map((org) => ({
      id: org.organization.id,
      name: org.organization.name,
      slug: org.organization.name.toLowerCase().replace(/\s+/g, '-'), // Generate slug if needed
    })) || [];

  // Transform invitations data for the InvitationList component
  const invitations =
    userInfo.invitations?.map((inv) => ({
      id: inv.id,
      organizationId: inv.organization.id,
      organizationName: inv.organization.name,
      organizationSlug: inv.organization.slug,
      invitedByName: inv.inviter.name || '',
      invitedById: inv.inviter.id,
      invitedByEmail: inv.inviter.email,
      role: inv.role || 'member',
      status: inv.status,
      expiresAt: new Date(inv.expiresAt),
    })) || [];

  // Transform agents data for the AvailableAgentsDropdown component
  const agents =
    userInfo.agents
      ?.filter((agentUser) => agentUser.isActive)
      .map((agentUser) => ({
        id: agentUser.agent.id,
        name: agentUser.agent.name,
        description: agentUser.agent.description,
        avatar: agentUser.agent.avatar,
        isPublic: true, // This might need to be added to the API response
        slug: agentUser.agent.slug,
        organizationId: agentUser.agent.organization.id,
      })) || [];

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="space-y-6">
        {/* Show Initialize Caddie button only for admin users */}
        {session.user.role === 'admin' && organizations.length === 0 && (
          <div className="flex justify-center">
            <CreateDefaultOrganizationButton className="w-full" />
          </div>
        )}

        {/* Always show User Profile */}
        <UserProfileCard user={userData} />

        {/* Show invitations if user has any */}
        {invitations.length > 0 && <InvitationList invitations={invitations} />}

        {/* Show organization selector if user has organizations */}
        {organizations.length > 0 && (
          <OrganizationSelector organizations={organizations} />
        )}

        {/* Always show Available Agents */}
        <AvailableAgentsDropdown agents={agents} />
      </div>
    </div>
  );
}
