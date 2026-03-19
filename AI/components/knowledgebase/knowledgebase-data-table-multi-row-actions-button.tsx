'use client';

import type { Table } from '@tanstack/react-table';
import { MoreVertical, Trash2, Download } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { KnowledgebaseDeleteItemsDialog } from './knowledgebase-delete-items-dialog';
import type { KnowledgebaseItemSchema } from './knowledgebase-data-table-columns';

interface DataTableMultiActionsProps<TData> {
  table: Table<TData>;
}

export function KnowledgebaseDataTableMultiRowActionsButton<TData>({
  table,
}: DataTableMultiActionsProps<KnowledgebaseItemSchema>) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const selectedRowCount = table.getFilteredSelectedRowModel().rows.length;

  const [loading, setLoading] = useState(false);

  async function downloadFile(id: string, name: string) {
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

  async function handleDownload() {
        setLoading(true);
        // delete each item
        for (const item of table.getFilteredSelectedRowModel().rows) {
          try {
            await downloadFile(item.original.id, item.original.name);
            toast.success(`File downloaded successfully ${item.original.name}`);
          } catch (error: any) {
            toast.error(`Failed to download ${item.original.name}`, {
              description: error.message,
            });
          }
        }           
        setLoading(false);
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1"
            disabled={selectedRowCount === 0}
          >
            <MoreVertical className="h-4 w-4" />
            {selectedRowCount > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                {selectedRowCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={handleDownload}
            disabled={loading}
          >
            <Download className=" mr-2 size-4" />
            <span>{loading ? "Downloading..." : "Download"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <KnowledgebaseDeleteItemsDialog
        items={table.getFilteredSelectedRowModel().rows.map((row) => ({
          id: row.original.id,
          name: row.original.name,
          type: row.original.type,
        }))}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      />
    </>
  );
}
