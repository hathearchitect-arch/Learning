'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTableColumnHeader } from '@/components/datatable/data-table-column-header';
import { DataTableRowActions } from '@/components/agent/agent-data-table-row-actions';
import { Badge } from '@/components/ui/badge';
import { availableModels, getModelIcon } from '@/lib/ai/models';

export type AgentItemSchema = {
  id: string;
  name: string;
  description: string;
  modelId: string;
  isActive: boolean;
  isPublic: boolean;
};

export const columns: ColumnDef<AgentItemSchema>[] = [
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
      return (
        <Link href={`/dashboard/agents/${row.original.id}`}>
          <div className="flex space-x-3 items-center">
            <span className="max-w-[500px] truncate font-medium">
              {row.original.name}
            </span>
          </div>
        </Link>
      );
    },
  },
  {
    accessorKey: 'description',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex space-x-3 items-center">
          <span className="max-w-[500px] truncate font-medium">
            {row.original.description}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'modelId',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Model" />
    ),
    cell: ({ row }) => {
      const currentModel = availableModels.find(
        (m) => m.value === row.original.modelId,
      );

      if (currentModel) {
        const IconComponent = getModelIcon(currentModel.provider);
        return (
          <div className="flex items-center gap-2">
            <IconComponent className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{currentModel.label}</span>
            {currentModel.isPremium && (
              <Badge variant="secondary" className="text-xs">
                Premium
              </Badge>
            )}
          </div>
        );
      }

      // Fallback for unknown models
      return (
        <div className="flex items-center">
          <span className="text-sm text-muted-foreground truncate max-w-[200px]">
            {row.original.modelId}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'isActive',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex space-x-3 items-center">
          <span className="max-w-[500px] truncate font-medium">
            {row.original.isActive ? (
              <Badge variant="default">Active</Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </span>
        </div>
      );
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
