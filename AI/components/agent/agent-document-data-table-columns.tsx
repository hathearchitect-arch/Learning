'use client';

import type { ColumnDef } from '@tanstack/react-table';
import {
  type Icon,
  IconFileExcel,
  IconFileTypeCsv,
  IconFileTypeDocx,
  IconFileTypeHtml,
  IconFileTypePdf,
  IconFileTypeTxt,
  IconMarkdown,
} from '@tabler/icons-react';
import { DataTableColumnHeader } from '@/components/datatable/data-table-column-header';
import { IndexingStatusCell } from '../knowledgebase/indexing-status-cell';

export type AgentDocumentSchema = {
  id: string;
  name: string;
  type: string;
  size?: number;
  s3Key?: string;
  isVectorized?: boolean;
  createdAt?: Date;
  folderName: string;
};

export const documentTypes: {
  value: string;
  label: string;
  icon?: Icon;
}[] = [
  {
    value: 'pdf',
    label: 'PDF',
    icon: IconFileTypePdf,
  },
  {
    value: 'docx',
    label: 'Word',
    icon: IconFileTypeDocx,
  },
  {
    value: 'xlsx',
    label: 'Excel',
    icon: IconFileExcel,
  },
  {
    value: 'txt',
    label: 'Text',
    icon: IconFileTypeTxt,
  },
  {
    value: 'csv',
    label: 'CSV',
    icon: IconFileTypeCsv,
  },
  {
    value: 'md',
    label: 'Markdown',
    icon: IconMarkdown,
  },
  {
    value: 'html',
    label: 'HTML',
    icon: IconFileTypeHtml,
  },
];

export const agentDocumentColumns: ColumnDef<AgentDocumentSchema>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Document Name" />
    ),
    cell: ({ row }) => {
      const type = documentTypes.find(
        (type) => type.value === row.original.type,
      );

      return (
        <div className="flex space-x-3 items-center">
          {type?.icon ? (
            <type.icon className="size-4" />
          ) : (
            <div className="size-4" />
          )}
          <span className="max-w-[500px] truncate font-medium">
            {row.original.name}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'folderName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Folder" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex items-center">
          <span className="max-w-[200px] truncate">
            {row.getValue('folderName')}
          </span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => {
      const type = documentTypes.find(
        (label) => label.value === row.original.type,
      );

      if (!type) {
        return <span className="text-muted-foreground">Unknown</span>;
      }

      return (
        <div className="flex w-[100px] items-center">
          <span>{type.label}</span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'size',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Size" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex items-center">
          <span>
            {row.getValue('size')
              ? `${((row.getValue('size') as number) / 1000000)
                  .toPrecision(2)
                  .toString()} MB`
              : '-'}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'isVectorized',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Indexed" />
    ),
    cell: ({ row }) =>
      row.original.type === 'folder' ? (
        <div className="flex items-center">-</div>
      ) : (
        <IndexingStatusCell
          fileId={row.original.id}
          initialIsVectorized={row.getValue('isVectorized') || false}
          fileType={row.original.type}
        />
      ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex items-center">
          <span>
            {row.getValue('createdAt')
              ? new Date(row.getValue('createdAt')).toLocaleString()
              : '-'}
          </span>
        </div>
      );
    },
  },
];
