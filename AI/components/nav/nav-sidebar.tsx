'use client';

import * as React from 'react';
import {
  IconDashboard,
  IconHome2,
  IconSettings,
  IconUsers,
  IconMessageChatbot,
  IconBrain,
  IconHelp,
} from '@tabler/icons-react';
import { OrganizationSwitcher } from '../organization/organization-switcher';
import { NavMain } from '@/components/nav/nav-main';
import { NavSecondary } from '@/components/nav/nav-secondary';
import { NavUser } from '@/components/nav/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

type NavSidebarProps = React.ComponentProps<typeof Sidebar> & {
  hasOrganizationConfigPermissions: boolean;
  organizationHelpLink: string | null;
};

export function NavSidebar({
  hasOrganizationConfigPermissions,
  organizationHelpLink,
  ...props
}: NavSidebarProps) {
  const data = {
    navMain: [
      {
        title: 'Dashboard',
        url: '/dashboard',
        icon: IconDashboard,
      },
      {
        title: 'Agents',
        url: '/dashboard/agents',
        icon: IconMessageChatbot,
      },
      {
        title: 'Knowledgebase',
        url: '/dashboard/knowledgebase',
        icon: IconBrain,
      },
      /*{ 
      title: 'Connectors',
      url: '/dashboard/connectors',
      icon: IconPlugConnected,
    }, */
      {
        title: 'Users',
        url: '/dashboard/users',
        icon: IconUsers,
      },
    ],
    navBottom: hasOrganizationConfigPermissions
      ? [
          {
            title: 'Back to Home',
            url: '/home',
            icon: IconHome2,
          },
          {
            title: 'Settings',
            url: '/dashboard/settings',
            icon: IconSettings,
          },
          /*          {
            title: 'Get Help',
            url: organizationHelpLink || '/dashboard/help',
            icon: IconHelp,
          },
        ]
      : [
          {
            title: 'Get Help',
            url: organizationHelpLink || '/dashboard/help',
            icon: IconHelp,
          },
        ],
*/
        ]
      : [],
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <OrganizationSwitcher />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navBottom} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
