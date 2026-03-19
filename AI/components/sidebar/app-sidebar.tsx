'use client';

import type { User } from 'better-auth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { PlusIcon } from '@/components/icons';
import { SidebarHistory } from '@/components/sidebar/sidebar-history';
import { SidebarUserNav } from '@/components/sidebar/sidebar-user-nav';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Bot } from 'lucide-react';

interface AppSidebarProps {
  user: User | undefined;
  agentId: string;
  agentName?: string;
  agentLogoUrl?: string | null;
  helpLinkUrl?: string | null;
}

export function AppSidebar({
  user,
  agentId,
  agentName = 'Chatbot',
  agentLogoUrl,
  helpLinkUrl,
}: AppSidebarProps) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  const chatUrl = `/agent/${agentId}/chat`;

  return (
    <Sidebar className="group-data-[side=left]:border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row items-center justify-between gap-2">
            <Link
              href={chatUrl}
              onClick={() => {
                setOpenMobile(false);
              }}
              className="flex flex-row gap-3 items-center flex-1 min-w-0"
            >
              {/* Agent Logo or Default Icon */}
              {agentLogoUrl ? (
                <div className="relative w-full max-w-[200px] h-16 flex-shrink-0">
                  <Image
                    src={agentLogoUrl}
                    fill
                    className="object-contain"
                    alt={agentName || 'Agent logo'}
                  />
                </div>
              ) : (
                <>
                  <Bot className="h-16 w-16 text-muted-foreground" />
                  <span className="text-lg font-semibold px-2 rounded-md">
                    {agentName}
                  </span>
                </>
              )}
            </Link>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  type="button"
                  className="p-2 h-fit"
                  onClick={() => {
                    setOpenMobile(false);
                    router.push(chatUrl);
                    router.refresh();
                  }}
                >
                  <PlusIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent align="end">New Chat</TooltipContent>
            </Tooltip>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarHistory user={user} agentId={agentId} />
      </SidebarContent>
      <SidebarFooter>
        {user && <SidebarUserNav user={user} helpLink={helpLinkUrl} />}
      </SidebarFooter>
    </Sidebar>
  );
}
