'use client';

import * as React from 'react';
import { ChevronsUpDown, Plus } from 'lucide-react';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { OrganizationCreateDialog } from './organization-create-dialog';
import { useState, useEffect } from 'react';
import {
  organization,
  useListOrganizations,
  useActiveOrganization,
  useActiveMember,
  useSession,
} from '@/lib/auth-client';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

async function getOrganizationLogoUrl(organizationId: string) {
  try {
    const response = await fetch(
      `/api/auth/organization/${organizationId}/logo`,
    );
    const data = await response.json();
    return data?.data?.logoUrl;
  } catch {
    return null;
  }
}

export function OrganizationSwitcher() {
  const { isMobile } = useSidebar();
  const [showNewOrgDialog, setShowNewOrgDialog] = useState(false);
  const { data: activeOrganization } = useActiveOrganization();
  const { data: activeMember } = useActiveMember();
  const [organizationLogoUrlMap, setOrganizationLogoUrlMap] = useState<
    Record<string, string>
  >({});

  const router = useRouter();
  const { data: session } = useSession();

  const { data: organizations, isPending } = useListOrganizations();

  async function handleSetActiveOrganization(organizationId: string) {
    await organization.setActive({ organizationId: organizationId });
    // if already on /dashboard, refresh with new active org. Else, route use to /dashboard
    if (window.location.pathname === '/dashboard') {
      router.refresh();
    } else {
      router.push('/dashboard');
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      const newOrgLogoUrlMap: Record<string, string> = {};
      for (const org of organizations || []) {
        try {
          const response = await fetch(`/api/auth/organization/${org.id}/logo`);
          const result = await response.json();
          if (result?.data?.logoUrl) {
            newOrgLogoUrlMap[org.id] = result.data.logoUrl;
          }
        } catch (error) {
          console.error(`Failed to fetch data for ${org.name}:`, error);
        }
      }
      setOrganizationLogoUrlMap(newOrgLogoUrlMap);
    };

    fetchData();
  }, [organizations]);

  if (isPending) {
    // Skeleton for the switcher button
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-3 p-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex flex-col gap-1 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={
                        organizationLogoUrlMap[activeOrganization?.id || ''] ||
                        activeOrganization?.logo ||
                        `https://avatar.vercel.sh/${activeOrganization?.slug}.svg`
                      }
                      alt={`${activeOrganization?.name} logo`}
                    />
                  </Avatar>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {activeOrganization?.name}
                  </span>
                  <span className="truncate text-xs">
                    {(activeMember?.role?.charAt(0).toUpperCase() ?? '') +
                      (activeMember?.role?.slice(1) ?? 'Member')}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              align="start"
              side={isMobile ? 'bottom' : 'right'}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Organizations
              </DropdownMenuLabel>
              {organizations?.map((org) => (
                <DropdownMenuItem
                  key={org.name}
                  onClick={() => handleSetActiveOrganization(org.id)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage
                        src={
                          organizationLogoUrlMap[org.id || ''] ||
                          org.logo ||
                          `https://avatar.vercel.sh/${activeOrganization?.slug}.svg`
                        }
                        alt={`${activeOrganization?.name} logo`}
                      />
                    </Avatar>
                  </div>
                  <span className="ml-1">{org.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 p-2"
                onSelect={() => setShowNewOrgDialog(true)}
                disabled={session?.user?.role !== 'admin'}
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <Plus className="size-4" />
                </div>
                <div className="text-muted-foreground font-medium">
                  Create Organization
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      <OrganizationCreateDialog
        open={showNewOrgDialog}
        onOpenChange={setShowNewOrgDialog}
      />
    </>
  );
}
