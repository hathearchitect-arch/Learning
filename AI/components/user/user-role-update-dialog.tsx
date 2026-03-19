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
import { Settings } from 'lucide-react';
import { Alert, AlertTitle } from '@/components/ui/alert';
import type { UserItemSchema } from '@/components/user/user-data-table-columns';
import { Badge } from '@/components/ui/badge';
import { organization, useActiveOrganization } from '@/lib/auth-client';

interface UserRoleUpdateDialogProps {
  user: UserItemSchema;
  newRole: 'owner' | 'admin' | 'member';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserRoleUpdateDialog({
  user,
  newRole,
  open,
  onOpenChange,
}: UserRoleUpdateDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();
  const { data: activeOrganization } = useActiveOrganization();

  async function handleUpdate() {
    setIsUpdating(true);

    try {
      await organization.updateMemberRole({
        memberId: user.id, // this is the member ID
        role: newRole as any, // casting to bypass TypeScript strict typing
        organizationId: activeOrganization?.id || '',
      });
      toast.success(
        `Successfully updated ${user.name}&apos;s role to ${newRole}`,
      );
      onOpenChange(false);
      router.refresh();
    } catch (error: any) {
      toast.error(`Failed to update ${user.name}&apos;s role`, {
        description: error.message,
      });
    } finally {
      setIsUpdating(false);
    }
  }

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Full access to all organization settings and can manage all members, billing, and delete the organization.';
      case 'admin':
        return 'Can manage organization settings, invite/remove members, and access all organization resources.';
      case 'member':
        return 'Can access organization resources but cannot manage settings or other members.';
      default:
        return '';
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update User Role</AlertDialogTitle>

          <Alert>
            <Settings size={16} />
            <AlertTitle>
              Change {user.name}&apos;s role from{' '}
              <Badge variant="outline" className="mx-1">
                {user.role}
              </Badge>
              to{' '}
              <Badge variant="default" className="mx-1">
                {newRole}
              </Badge>
            </AlertTitle>
          </Alert>

          <AlertDialogDescription>
            <strong>
              {newRole.charAt(0).toUpperCase() + newRole.slice(1)} permissions:
            </strong>
            <br />
            {getRoleDescription(newRole)}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating ? 'Updating...' : 'Update Role'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
