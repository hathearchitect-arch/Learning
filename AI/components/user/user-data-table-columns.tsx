'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTableColumnHeader } from '@/components/datatable/data-table-column-header';
import { UserDataTableRowActions } from '@/components/user/user-data-table-row-actions';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type UserItemSchema = {
  id: string; // member ID or invitation ID
  userId?: string; // user ID (only for members)
  name: string;
  email: string;
  image?: string;
  role: 'owner' | 'admin' | 'member';
  status: 'active' | 'pending' | 'rejected'; // to distinguish between members and invitations
  invitationId?: string; // invitation ID for pending invitations
  agentAccess?: Array<{
    id: string;
    name: string;
    description?: string;
    isActive: boolean;
    avatar?: string;
    logoS3Key?: string;
    status: 'active' | 'pending' | 'rejected'; // agent access status
  }>;
};

export const columns: ColumnDef<UserItemSchema>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => {
      const status = row.original.status;
      const agentAccess = row.original.agentAccess;

      return (
        <div className="flex space-x-3 items-center">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={
                row.original.image ||
                `https://avatar.vercel.sh/${row.original.email}.svg`
              }
              alt={row.original.name}
            />
            <AvatarFallback>
              {status === 'active'
                ? row.original.name
                    ?.split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase() || '?'
                : '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="max-w-[500px] truncate font-medium">
              {status === 'active'
                ? row.original.name
                : `${row.original.email}`}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex space-x-3 items-center">
          <span className="max-w-[500px] truncate">{row.original.email}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'role',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Role" />
    ),
    cell: ({ row }) => {
      const role = row.original.role;
      const roleVariants = {
        owner: 'default',
        admin: 'secondary',
        member: 'outline',
      } as const;

      return (
        <div className="flex space-x-2 items-center">
          <Badge variant={roleVariants[role] || 'outline'}>
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.original.status;
      const statusVariants = {
        active: 'default',
        pending: 'secondary',
        rejected: 'destructive',
      } as const;

      return (
        <div className="flex space-x-2 items-center">
          <Badge variant={statusVariants[status]} className="text-xs">
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: 'agentAccess',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Agent Access" />
    ),
    cell: ({ row }) => {
      const user = row.original;
      const { role, status, agentAccess } = user;

      // For admins and owners, show "All"
      if (role === 'admin' || role === 'owner') {
        return <div className="flex items-center">-</div>;
      }

      if (!agentAccess || agentAccess.length === 0) {
        return <span className="text-muted-foreground text-sm">No access</span>;
      }

      // Filter agents by status
      const activeAgents = agentAccess.filter(
        (agent) => agent.status === 'active',
      );
      const pendingAgents = agentAccess.filter(
        (agent) => agent.status === 'pending',
      );

      // For active members, show their active agent access
      if (status === 'active' && activeAgents.length > 0) {
        return (
          <TooltipProvider delayDuration={0}>
            <div className="flex items-center -space-x-2">
              {activeAgents.slice(0, 3).map((agent) => (
                <Tooltip key={agent.id}>
                  <TooltipTrigger asChild>
                    <Avatar className="h-6 w-6 border-2 border-background">
                      <AvatarImage
                        src={
                          agent.avatar ||
                          `https://avatar.vercel.sh/${agent.name}.svg`
                        }
                        alt={agent.name}
                      />
                      <AvatarFallback className="text-xs">
                        {agent.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <div className="font-medium">{agent.name}</div>
                      {agent.description && (
                        <div className="text-muted-foreground text-xs max-w-[200px]">
                          {agent.description}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
              {activeAgents.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">
                    +{activeAgents.length - 3}
                  </span>
                </div>
              )}
            </div>
          </TooltipProvider>
        );
      }

      // For pending users, show their pending agent access
      if (pendingAgents.length > 0) {
        return (
          <TooltipProvider delayDuration={0}>
            <div className="flex items-center -space-x-2">
              {pendingAgents.slice(0, 3).map((agent) => (
                <Tooltip key={agent.id}>
                  <TooltipTrigger asChild>
                    <Avatar className="h-6 w-6 border-2 border-background opacity-60">
                      <AvatarImage
                        src={
                          agent.avatar ||
                          `https://avatar.vercel.sh/${agent.name}.svg`
                        }
                        alt={agent.name}
                      />
                      <AvatarFallback className="text-xs">
                        {agent.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <div className="font-medium">{agent.name}</div>
                      {agent.description && (
                        <div className="text-muted-foreground text-xs max-w-[200px]">
                          {agent.description}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
              {pendingAgents.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center opacity-60">
                  <span className="text-xs text-muted-foreground">
                    +{pendingAgents.length - 3}
                  </span>
                </div>
              )}
            </div>
          </TooltipProvider>
        );
      }

      return <span className="text-muted-foreground text-sm">—</span>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      return <UserDataTableRowActions row={row} />;
    },
  },
];
