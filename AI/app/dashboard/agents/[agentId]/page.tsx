import { redirect } from 'next/navigation';
import { AdminPageHeader } from '@/components/admin-page-header';
import { ArrowUpRight, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/auth';
import { caddieApi } from '@/lib/api';
import { AgentTabs } from '@/components/agent/agent-tabs';
import Link from 'next/link';
import { AgentDeleteButton } from '@/components/agent/agent-delete-button';

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

  const { agentId } = await params;
  const { tab } = await searchParams;

  const { data: agent } = await caddieApi.get(`/api/agent/${agentId}`);

  return (
    <>
      <AdminPageHeader
        title={`${agent.name}`}
        description={agent.description || 'No description provided.'}
      >
        <Link
          href={`/agent/${agentId}/chat`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="ghost">
            Chat with agent
            <ArrowUpRight size="icon" className="size-4 ml-1" />
          </Button>
        </Link>
        <AgentDeleteButton agent={agent} />
        <Button variant="outline" size="sm" disabled={true}>
          <MoreVertical size="icon" className="size-4" />
        </Button>
      </AdminPageHeader>
      <AgentTabs
        agent={agent}
        defaultTab={tab || 'dashboard'}
        session={session}
      />
    </>
  );
}
