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
import { Mail } from 'lucide-react';
import { Alert, AlertTitle } from '@/components/ui/alert';
import type { UserItemSchema } from '@/components/user/user-data-table-columns';
import { organization } from '@/lib/auth-client';

interface InvitationCancelDialogProps {
  user: UserItemSchema;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvitationCancelDialog({
  user,
  open,
  onOpenChange,
}: InvitationCancelDialogProps) {
  const [isCanceling, setIsCanceling] = useState(false);
  const router = useRouter();

  async function handleCancel() {
    setIsCanceling(true);

    try {
      // First, remove pending agent access if the user has any
      if (user.agentAccess && user.agentAccess.length > 0) {
        const pendingAgents = user.agentAccess.filter(
          (agent) => agent.status === 'pending',
        );

        // Remove user from each agent they have pending access to
        for (const agent of pendingAgents) {
          try {
            await fetch(`/api/agent/${agent.id}/users`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: user.email,
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

      // Then cancel the organization invitation
      await organization.cancelInvitation({
        invitationId: user.invitationId || user.id,
      });

      const action = user.status === 'pending' ? 'canceled' : 'removed';
      toast.success(`Successfully ${action} invitation for ${user.email}`);
      onOpenChange(false);
      router.refresh();
    } catch (error: any) {
      const action = user.status === 'pending' ? 'cancel' : 'remove';
      toast.error(`Failed to ${action} invitation for ${user.email}`, {
        description: error.message,
      });
    } finally {
      setIsCanceling(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {user.status === 'pending' ? 'Cancel' : 'Remove'} Invitation
          </AlertDialogTitle>

          <Alert>
            <Mail size={16} />
            <AlertTitle>
              Invitation for {user.email} will be{' '}
              {user.status === 'pending' ? 'canceled' : 'removed'}
            </AlertTitle>
          </Alert>

          <AlertDialogDescription>
            {user.status === 'pending'
              ? `This action will cancel the pending invitation for ${user.email}. They will no longer be able to join the organization using this invitation link.${
                  user.agentAccess?.some((agent) => agent.status === 'pending')
                    ? ' Any pending agent access will also be removed.'
                    : ''
                }`
              : `This action will remove the rejected invitation for ${user.email} from your records.${
                  user.agentAccess?.some((agent) => agent.status === 'pending')
                    ? ' Any pending agent access will also be removed.'
                    : ''
                }`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCanceling}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={isCanceling}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isCanceling
              ? `${user.status === 'pending' ? 'Canceling' : 'Removing'}...`
              : `${user.status === 'pending' ? 'Cancel' : 'Remove'} Invitation`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
