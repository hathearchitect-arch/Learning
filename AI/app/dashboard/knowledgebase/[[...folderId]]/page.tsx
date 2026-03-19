import { redirect } from 'next/navigation';
import { FileUploadButton } from '@/components/knowledgebase/knowledgebase-file-upload-button';
import { FolderCreateButton } from '@/components/knowledgebase/knowledgebase-create-folder-button';
import { getSession } from '@/lib/auth';
import { caddieApi } from '@/lib/api';
import { DataTable } from '@/components/datatable/data-table';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  columns,
  type KnowledgebaseItemSchema,
  knowledgebaseItemTypes,
} from '@/components/knowledgebase/knowledgebase-data-table-columns';
import { KnowledgebaseDataTableMultiRowActionsButton } from '@/components/knowledgebase/knowledgebase-data-table-multi-row-actions-button';
import { AdminPageHeader } from '@/components/admin-page-header';
import { FolderBreadcrumbs } from '@/components/knowledgebase/knowledgebase-breadcrumbs';

export default async function Page({
  params,
}: { params: Promise<{ folderId?: string }> }) {
  const session = await getSession();
  if (!session || !session.user.id || !session.session.activeOrganizationId) {
    redirect('/signin');
  }

  const { folderId } = await params;

  const { data: folder } = await caddieApi.get(
    `/api/folder${folderId ? `/${folderId}` : ''}`,
  );

  const knowledgebaseItems: KnowledgebaseItemSchema[] = [
    ...folder.childFolders.map((item: any) => ({
      id: item.id,
      name: item.name,
      type: 'folder',
      size: item.size,
      s3Key: item.s3Key,
      createdAt: item.createdAt,
    })),

    ...folder.files.map((item: any) => ({
      id: item.id,
      name: item.name,
      type: item.type || 'file',
      size: item.size,
      s3Key: item.s3Key,
      isVectorized: item.isVectorized,
      createdAt: item.updatedAt,
    })),
  ];

  const filters = [
    { column: 'type', title: 'Type', options: knowledgebaseItemTypes },
  ];

  return (
    <>
      <AdminPageHeader
        title={'Knowledgebase Documents'}
        description="Manage your knowledgebase documents and folders."
      >
        <FolderCreateButton parentFolderId={folder.id} />
        <FileUploadButton parentFolderId={folder.id} />
        <Button variant="outline" size="sm" disabled={true}>
          <MoreVertical size="icon" className="size-4" />
        </Button>
      </AdminPageHeader>
      <div className="flex flex-col gap-4">
        <FolderBreadcrumbs breadcrumbs={folder.breadcrumbs} />
        <DataTable
          columns={columns}
          data={knowledgebaseItems}
          filters={filters}
          multiRowActions={KnowledgebaseDataTableMultiRowActionsButton}
        />
      </div>
    </>
  );
}
