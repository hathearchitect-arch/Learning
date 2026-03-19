import { redirect } from 'next/navigation';
import { AdminPageHeader } from '@/components/admin-page-header';
import { MoreVertical } from 'lucide-react';
import { DataTable } from '@/components/datatable/data-table';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/auth';
import { AgentCreateButton } from '@/components/agent/agent-create-button';
import {
  columns,
  type AgentItemSchema,
} from '@/components/agent/agent-data-table-columns';
import { caddieApi } from '@/lib/api';

export default async function Page() {
  const session = await getSession();
  if (!session || !session.user.id || !session.session.activeOrganizationId) {
    redirect('/signin');
  }

  const data: AgentItemSchema[] = [
    {
      id: '1',
      name: 'Agent One',
      description: 'This is the first agent.',
      modelId: 'llama-3-70b',
      isActive: true,
      isPublic: false,
    },
    {
      id: '2',
      name: 'Agent Two',
      description: 'This is the second agent.',
      modelId: 'anthropic-claude-2',
      isActive: false,
      isPublic: true,
    },
  ];

  const { data: agents } = await caddieApi.get(`/api/agent`);

  return (
    <>
      <AdminPageHeader
        title={'Agents'}
        description="Manage your agents and their configurations."
      >
        <AgentCreateButton />
        <Button variant="outline" size="sm" disabled={true}>
          <MoreVertical size="icon" className="size-4" />
        </Button>
      </AdminPageHeader>
      <DataTable columns={columns} data={agents} />
    </>
  );
}
