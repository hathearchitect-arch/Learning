'use client';

import { MoreVertical, Trash, ClipboardCopy } from 'lucide-react';
import type { Row } from '@tanstack/react-table';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AgentItemSchema } from '@/components/agent/agent-data-table-columns';
import { AgentDeleteItemsDialog } from './agent-delete-dialog';
import { toast } from 'sonner';

interface DataTableRowActionsProps<TData> {
  row: Row<AgentItemSchema>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const [deleteAgentDialogOpen, setDeleteAgentDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const id = row.original.id;
  const name = row.original.name;

  const handleCopy = () => {
    if (navigator.clipboard) {
      const agentUrlLink = `${window.location.href.replace(window.location.pathname, '')}/agent/${row.original.id}`;
      navigator.clipboard
        .writeText(agentUrlLink)
        .then(() => {
          toast.success('Copied link to styled agent signin');
        })
        .catch((err) => {
          toast.error('Failed to copy link');
          console.error('Failed to copy text: ', err);
        });
    }
  };

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="size-6 p-0">
            <span className="sr-only">Open menu</span>
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleCopy}>
            <ClipboardCopy className=" mr-2 size-4" />
            <span>Copy link</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setDeleteAgentDialogOpen(true)}
          >
            <Trash className=" mr-2 size-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AgentDeleteItemsDialog
        items={[{ id: id, name: name }]}
        open={deleteAgentDialogOpen}
        onOpenChange={setDeleteAgentDialogOpen}
      />
    </>
  );
}
