'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type Agent = {
  id: string;
  name: string;
  description: string;
  prompt: string;
  isActive: boolean;
  temperature: number;
  knowledgebase: {
    enabled: boolean;
    searchDepth: 'shallow' | 'medium' | 'deep';
    maxResults: number;
    similarityThreshold: number;
  };
  createdAt: string;
  lastModified: string;
};

interface AgentDeleteButtonProps {
  agent: Agent;
}

export function AgentDeleteButton({ agent }: AgentDeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/agent/${agent.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete agent');
      }

      toast.success('Agent deleted', {
        description: `Agent "${agent.name}" has been permanently deleted.`,
      });

      router.push('/dashboard/agents');
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.error('Failed to delete agent', {
        description: 'An unexpected error occurred. Please try again.',
      });
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 size={'icon'} className="size-4 animate-spin" />
          ) : (
            <Trash2 size={'icon'} className="size-4" />
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the agent
            &quot;{agent.name}&quot; and remove all associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete Agent
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
