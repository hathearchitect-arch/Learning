'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { refreshPage } from '@/lib/api/actions';
import { usePathname } from 'next/navigation';
import { AlertCircleIcon } from 'lucide-react';
import { Alert, AlertTitle } from '@/components/ui/alert';

interface KnowledgebaseItem {
  id: string;
  name: string;
  type: string;
}

interface DeleteFileDialogProps {
  items: KnowledgebaseItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KnowledgebaseDeleteItemsDialog({
  items,
  open,
  onOpenChange,
}: DeleteFileDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const pathname = usePathname();

  async function deleteItem(id: string, type: string) {
    const res = await fetch(
      `/api/${type === 'folder' ? 'folder' : 'file'}/${id}`,
      {
        method: 'DELETE',
      },
    );

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    // delete each item
    for (const item of items) {
      try {
        await deleteItem(item.id, item.type);
        toast.success(`Successfully deleted ${item.type}: ${item.name}`);
      } catch (error: any) {
        toast.error(`Failed to delete ${item.type}: ${item.name}`, {
          description: error.message,
        });
      }
    }

    onOpenChange(false);
    refreshPage(pathname);
    setIsDeleting(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{`Are you sure?`}</AlertDialogTitle>

          <Alert variant="destructive">
            <AlertCircleIcon size={16} />
            <AlertTitle>{items.length} items will be deleted</AlertTitle>
          </Alert>

          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete{' '}
            <strong>{items.length}</strong> from the knowledgebase.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
