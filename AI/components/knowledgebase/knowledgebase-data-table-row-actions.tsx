'use client';

import { MoreVertical, Trash, Download} from 'lucide-react';
import type { Row } from '@tanstack/react-table';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { KnowledgebaseItemSchema } from '@/components/knowledgebase/knowledgebase-data-table-columns';
import { KnowledgebaseDeleteItemsDialog } from './knowledgebase-delete-items-dialog';

interface DataTableRowActionsProps<TData> {
  row: Row<KnowledgebaseItemSchema>;
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const [deleteFolderDialogOpen, setDeleteFolderDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const id = row.original.id;
  const type = row.original.type;
  const name = row.original.name;

  const [loading, setLoading] = useState(false);

  async function downloadFile() {
    toast.success(`Downloading file ${name}`);
    setLoading(true);
    try {
        const res = await fetch(
        `/api/file/download/${id}`,
        {
          method: 'GET',
        },
      );

      if (!res.ok) throw new Error("Failed to download");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = name.split("/").pop()!;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success(`File downloaded successfully ${name}`);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(`Failed to download`);
    } finally {
      setLoading(false);
    }
  }

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
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setDeleteFolderDialogOpen(true)}
          >
            <Trash className=" mr-2 size-4" />
            <span>Delete</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={downloadFile}
            disabled={loading}
          >
            <Download className=" mr-2 size-4" />
            <span>{loading ? "Downloading..." : "Download"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <KnowledgebaseDeleteItemsDialog
        items={[{ id: id, name: name, type: type }]}
        open={deleteFolderDialogOpen}
        onOpenChange={setDeleteFolderDialogOpen}
      />
    </>
  );
}
