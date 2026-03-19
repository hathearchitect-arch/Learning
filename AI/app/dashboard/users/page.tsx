import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { DataTable } from '@/components/datatable/data-table';
import { AddUserButton } from '@/components/user/user-add-button';
import { AdminPageHeader } from '@/components/admin-page-header';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
import { caddieApi } from '@/lib/api';
import {
  columns,
  type UserItemSchema,
} from '@/components/user/user-data-table-columns';

export default async function Page() {
  const session = await getSession();
  if (!session) {
    redirect('/signin');
  }

  // Fetch users data
  let users: UserItemSchema[] = [];

  try {
    const response = await caddieApi.get('/api/users');
    if (response?.success) {
      users = response.data || [];
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    users = [];
  }

  // Data Table Filters Definition
  const filters = [
    {
      column: 'role',
      title: 'Role',
      options: [
        { value: 'owner', label: 'Owner' },
        { value: 'admin', label: 'Admin' },
        { value: 'member', label: 'Member' },
      ],
    },
    {
      column: 'status',
      title: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'pending', label: 'Pending' },
        { value: 'rejected', label: 'Rejected' },
      ],
    },
  ];

  return (
    <>
      <AdminPageHeader
        title={'Users'}
        description="Manage your organization members and their roles."
      >
        <AddUserButton />
        <Button variant="outline" size="sm" disabled={true}>
          <MoreVertical size="icon" className="size-4" />
        </Button>
      </AdminPageHeader>

      <DataTable columns={columns} data={users} filters={filters} />
    </>
  );
}
