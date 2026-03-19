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
import { useRouter } from 'next/navigation';
import { AlertCircleIcon } from 'lucide-react';
import { Alert, AlertTitle } from '@/components/ui/alert';
import type { UserItemSchema } from '@/components/user/user-data-table-columns';
import { organization, useActiveOrganization } from '@/lib/auth-client';

interface UserRemoveDialogProps {
  user: UserItemSchema;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserRemoveDialog({
  user,
  open,
  onOpenChange,
}: UserRemoveDialogProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const router = useRouter();
  const { data: activeOrganization } = useActiveOrganization();

  async function handleRemove() {
    setIsRemoving(true);

    try {
      // First, remove user's agent access if they have any
      if (user.agentAccess && user.agentAccess.length > 0) {
        const agentsToRemoveFrom = user.agentAccess.filter(
          (agent) => agent.status === 'active',
        );

        // Remove user from each agent they have access to
        for (const agent of agentsToRemoveFrom) {
          try {
            await fetch(`/api/agent/${agent.id}/users`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: user.userId, // Use userId for active members
              }),
            });
          } catch (agentError) {
            console.error(
              `Failed to remove user from agent ${agent.id}:`,
              agentError,
            );
            // Continue with other agents even if one fails
          }
        }
      }

      // Then remove the user from the organization
      await organization.removeMember({
        memberIdOrEmail: user.id, // using member ID
        organizationId: activeOrganization?.id || '',
      });

      toast.success(`Successfully removed ${user.name} from the organization`);
      onOpenChange(false);
      router.refresh();
    } catch (error: any) {
      toast.error(`Failed to remove ${user.name}`, {
        description: error.message,
      });
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove User from Organization</AlertDialogTitle>

          <Alert variant="destructive">
            <AlertCircleIcon size={16} />
            <AlertTitle>{user.name} will be removed</AlertTitle>
          </Alert>

          <AlertDialogDescription>
            This action cannot be undone. <strong>{user.name}</strong> (
            {user.email}) will be removed from the organization and will lose
            access to all organization resources.
            {user.agentAccess?.some((agent) => agent.status === 'active')
              ? ' Their access to all agents will also be removed.'
              : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemove}
            disabled={isRemoving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isRemoving ? 'Removing...' : 'Remove User'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
