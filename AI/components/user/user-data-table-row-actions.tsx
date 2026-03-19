'use client';

import {
  MoreVertical,
  Trash,
  Settings,
  Shield,
  User,
  Mail,
} from 'lucide-react';
import type { Row } from '@tanstack/react-table';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { UserItemSchema } from '@/components/user/user-data-table-columns';
import { UserRemoveDialog } from './user-remove-dialog';
import { UserRoleUpdateDialog } from './user-role-update-dialog';
import { InvitationCancelDialog } from './user-invitation-cancel-dialog';
import { UserAgentAccessDialog } from './user-agent-access-dialog';

interface DataTableRowActionsProps<TData> {
  row: Row<UserItemSchema>;
}

export function UserDataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const [removeUserDialogOpen, setRemoveUserDialogOpen] = useState(false);
  const [roleUpdateDialogOpen, setRoleUpdateDialogOpen] = useState(false);
  const [cancelInvitationDialogOpen, setCancelInvitationDialogOpen] =
    useState(false);
  const [agentAccessDialogOpen, setAgentAccessDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<
    'owner' | 'admin' | 'member'
  >('member');

  const user = row.original;
  const currentRole = user.role;
  const isActive = user.status === 'active';
  const isPending = user.status === 'pending';
  const isRejected = user.status === 'rejected';
  const isNonAdmin = currentRole !== 'admin' && currentRole !== 'owner';

  const handleRoleChange = (newRole: 'owner' | 'admin' | 'member') => {
    setSelectedRole(newRole);
    setRoleUpdateDialogOpen(true);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return Shield;
      case 'admin':
        return Settings;
      case 'member':
        return User;
      default:
        return User;
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
          {isActive && (
            <>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Settings className="mr-2 size-4" />
                  <span>Change Role</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {(['owner', 'admin', 'member'] as const).map((role) => {
                    const IconComponent = getRoleIcon(role);
                    const isCurrentRole = role === currentRole;
                    return (
                      <DropdownMenuItem
                        key={role}
                        onClick={() => handleRoleChange(role)}
                        disabled={isCurrentRole}
                        className={isCurrentRole ? 'opacity-50' : ''}
                      >
                        <IconComponent className="mr-2 size-4" />
                        <span>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </span>
                        {isCurrentRole && (
                          <span className="ml-auto text-xs">(current)</span>
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
            </>
          )}
          {isNonAdmin && (
            <>
              <DropdownMenuItem onClick={() => setAgentAccessDialogOpen(true)}>
                <Shield className="mr-2 size-4" />
                <span>Manage Agent Access</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() =>
              isActive
                ? setRemoveUserDialogOpen(true)
                : setCancelInvitationDialogOpen(true)
            }
          >
            {isActive ? (
              <>
                <Trash className="mr-2 size-4" />
                <span>Remove from Organization</span>
              </>
            ) : isPending ? (
              <>
                <Mail className="mr-2 size-4" />
                <span>Cancel Invitation</span>
              </>
            ) : (
              <>
                <Trash className="mr-2 size-4" />
                <span>Remove Rejected Invitation</span>
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <UserRemoveDialog
        user={user}
        open={removeUserDialogOpen}
        onOpenChange={setRemoveUserDialogOpen}
      />

      <UserRoleUpdateDialog
        user={user}
        newRole={selectedRole}
        open={roleUpdateDialogOpen}
        onOpenChange={setRoleUpdateDialogOpen}
      />

      <InvitationCancelDialog
        user={user}
        open={cancelInvitationDialogOpen}
        onOpenChange={setCancelInvitationDialogOpen}
      />

      <UserAgentAccessDialog
        user={user}
        open={agentAccessDialogOpen}
        onOpenChange={setAgentAccessDialogOpen}
      />
    </>
  );
}
