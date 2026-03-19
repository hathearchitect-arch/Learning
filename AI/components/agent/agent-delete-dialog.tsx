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

interface AgentItem {
  id: string;
  name: string;
}

interface DeleteAgentDialogProps {
  items: AgentItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentDeleteItemsDialog({
  items,
  open,
  onOpenChange,
}: DeleteAgentDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const pathname = usePathname();

  async function deleteItem(id: string) {
    const res = await fetch(`/api/agent/${id}`, {
      method: 'DELETE',
    });

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
        await deleteItem(item.id);
        toast.success(`Successfully deleted agent: ${item.name}`);
      } catch (error: any) {
        toast.error(`Failed to delete agent: ${item.name}`, {
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
            <AlertTitle>{items.length} Agent(s) will be deleted</AlertTitle>
          </Alert>

          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete{' '}
            <strong>{items.length}</strong> agents. Users will no longer be able
            to access these agents.
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
