import { AdminPageHeader } from '@/components/admin-page-header';
import { SectionCards } from '@/components/dashboard/dashboard-cards';
import { ChatActivityChart } from '@/components/dashboard/dashboard-chat-activity-chart';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
import { caddieApi } from '@/lib/api';
import { DataTable } from '@/components/datatable/data-table';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import type { MetricsData } from '../api/metrics/route';

import { RecentChatColumns } from '@/components/dashboard/dashboard-datatable-columns';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

function safeDivide(numerator: number, denominator: number): number {
  return denominator !== 0 ? numerator / denominator : numerator / 1; // Return 0 or any fallback value
}

async function getMetrics(): Promise<MetricsData> {
  try {
    const response: ApiResponse<MetricsData> =
      await caddieApi.get('/api/metrics');

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch metrics');
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching metrics:', error);
    // Return default values if API fails
    return {
      totalUsers: 0,
      totalDocuments: 0,
      totalChatsCurrentPeriod: 0,
      totalChatsPreviousPeriod: 0,
      totalMessagesCurrentPeriod: 0,
      totalMessagesPreviousPeriod: 0,
      totalActiveUsersCurrentPeriod: 0,
      totalActiveUsersPreviousPeriod: 0,
      dailyChatCounts: [],
      dailyMessageCounts: [],
      recentChats: [],
    };
  }
}

export default async function AdminPage() {
  const session = await getSession();
  if (!session) {
    redirect('/signin');
  }

  const {
    totalUsers,
    totalDocuments,
    totalChatsCurrentPeriod,
    totalChatsPreviousPeriod,
    totalMessagesCurrentPeriod,
    totalMessagesPreviousPeriod,
    totalActiveUsersCurrentPeriod,
    totalActiveUsersPreviousPeriod,
    dailyChatCounts,
    dailyMessageCounts,
    recentChats,
  } = await getMetrics();
  type cardDataType = {
    title: string;
    description: string;
    value: string;
    change?: string;
    changeType?: 'up' | 'down';
  };
  const cardData: cardDataType[] = [
    {
      title: 'Active Users',
      description: 'Last 30 days',
      value: totalActiveUsersCurrentPeriod.toLocaleString(),
      change: `${(safeDivide(totalActiveUsersCurrentPeriod - totalActiveUsersPreviousPeriod, totalActiveUsersPreviousPeriod) * 100).toFixed(0)}%`,
      changeType:
        totalActiveUsersCurrentPeriod - totalActiveUsersPreviousPeriod > 0
          ? 'up'
          : 'down',
    },
    {
      title: 'Total Users',
      description: 'All time',
      value: totalUsers.toLocaleString(),
    },
    {
      title: 'Chats Initiated',
      description: 'Last 30 days',
      value: totalChatsCurrentPeriod.toLocaleString(),
      change: `${(safeDivide(totalChatsCurrentPeriod - totalChatsPreviousPeriod, totalChatsPreviousPeriod) * 100).toFixed(0)}%`,
      changeType:
        totalChatsCurrentPeriod > totalChatsPreviousPeriod ? 'up' : 'down',
    },
    {
      title: 'Messages Sent',
      description: 'Last 30 days',
      value: totalMessagesCurrentPeriod.toLocaleString(),
      change: `${(safeDivide(totalMessagesCurrentPeriod - totalMessagesPreviousPeriod, totalMessagesPreviousPeriod) * 100).toFixed(0)}%`,
      changeType:
        totalMessagesCurrentPeriod > totalMessagesPreviousPeriod
          ? 'up'
          : 'down',
    },
    {
      title: 'Total Documents',
      description: 'All time',
      value: totalDocuments.toLocaleString(),
    },
  ];

  // must correspond with columns defined above. Tanstack table changes dots to underscores: user.name -> user_name
  const initialColumnVisibility = {
    user_name: true,
    user_email: false,
    agent_name: true,
    chatMetadata_title: true,
    chatMetadata_createdAt: false,
    chatMetadata_mostRecentMessageDate: true,
  };

  return (
    <>
      <AdminPageHeader title="Dashboard" description="Admin Dashboard">
        <Button variant="outline" size="sm" disabled={true}>
          <MoreVertical size="icon" className="size-4" />
        </Button>
      </AdminPageHeader>
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 md:gap-6">
            <SectionCards cards={cardData} />
            <div>
              <ChatActivityChart
                data={dailyMessageCounts}
                totalMessages={totalMessagesCurrentPeriod}
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Recent Conversations</h2>
              <p className="text-sm text-muted-foreground">Last 30 days</p>
              <div className="mt-4">
                <DataTable
                  data={recentChats || []}
                  columns={RecentChatColumns}
                  searchColumnName="user_name"
                  searchPlaceholder="Search user name..."
                  initialColumnVisibility={initialColumnVisibility}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
