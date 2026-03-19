'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { FolderClosed } from 'lucide-react';
import {
  type Icon,
  IconFileExcel,
  IconFileTypeCsv,
  IconFileTypeDocx,
  IconFileTypeHtml,
  IconFileTypePdf,
  IconFileTypeTxt,
  IconFolderBolt,
  IconMarkdown,
} from '@tabler/icons-react';
import { DataTableColumnHeader } from '@/components/datatable/data-table-column-header';
import { DataTableRowActions } from '@/components/knowledgebase/knowledgebase-data-table-row-actions';
import { IndexingStatusCell } from './indexing-status-cell';

export type KnowledgebaseItemSchema = {
  id: string;
  name: string;
  type: string;
  size?: number;
  s3Key?: string;
  status?: string;
  isVectorized?: boolean;
  createdAt?: Date;
};

export const knowledgebaseItemTypes: {
  value: string;
  label: string;
  icon?: Icon;
}[] = [
  {
    value: 'folder',
    label: 'Folder',
    icon: IconFolderBolt,
  },
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

export const columns: ColumnDef<KnowledgebaseItemSchema>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => {
      const type = knowledgebaseItemTypes.find(
        (type) => type.value === row.original.type,
      );

      return (
        <div className="flex space-x-3 items-center">
          {type?.icon ? (
            <type.icon className="size-4" />
          ) : (
            <FolderClosed className="size-4" />
          )}
          {type && type.value === 'folder' ? (
            <Link href={`/dashboard/knowledgebase/${row.original.id}`}>
              <span className="max-w-[500px] truncate font-medium">
                {row.original.name}
              </span>
            </Link>
          ) : (
            <span className="max-w-[500px] truncate font-medium">
              {row.original.name}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => {
      const type = knowledgebaseItemTypes.find(
        (label) => label.value === row.original.type,
      );

      if (!type) {
        return null;
      }

      return (
        <div className="flex w-[100px] items-center">
          {type && <span className="">{type.label}</span>}
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
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
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
          status={row.original.status}
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
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      return (
        <>
          <DataTableRowActions row={row} />
        </>
      );
    },
  },
];
