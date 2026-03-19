import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { file, message, chat, member, agent, user } from '@/lib/db/schema';
import { sql, count, countDistinct, eq } from 'drizzle-orm';
import { gte, and, lt, desc } from 'drizzle-orm';
import { auth, getSession, getActiveOrganization } from '@/lib/auth';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

type DailyCount = {
  date: string; // YYYY-MM-DD format
  count: number;
};

export type Message = {
  id: string;
  role: string;
  messageParts: string | unknown;
  createdAt: string;
};

export type RecentChat = {
  chatMetadata: {
    id: string;
    createdAt: string;
    title: string;
    mostRecentMessageDate: string;
  };
  agent: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
};

export type MetricsData = {
  totalUsers: number;
  totalDocuments: number;
  totalChatsCurrentPeriod: number;
  totalChatsPreviousPeriod: number;
  totalMessagesCurrentPeriod: number;
  totalMessagesPreviousPeriod: number;
  totalActiveUsersCurrentPeriod: number;
  totalActiveUsersPreviousPeriod: number;
  dailyChatCounts: DailyCount[];
  dailyMessageCounts: DailyCount[];
  recentChats: RecentChat[];
};

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const activeOrganization = await getActiveOrganization(request);

    if (!session?.user || !activeOrganization) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Session or active organization is invalid',
        },
        { status: 401 },
      );
    }

    //check if user has app-level admin permissions
    const adminPermission = await auth.api.userHasPermission({
      body: {
        userId: session.user.id,
        permission: {
          dashboard: ['retrieve'],
        },
      },
    });

    //check if user has org-level permissions
    const organizationPermission = await auth.api.hasPermission({
      headers: request.headers,
      body: {
        organizationId: activeOrganization.id,
        permissions: {
          dashboard: ['retrieve'],
        },
      },
    });
    if (!adminPermission.success && !organizationPermission.success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const organizationId = activeOrganization.id;

    // Calculate date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Get total users in organization
    const totalUsersResult = await db
      .select({ count: count() })
      .from(member)
      .where(eq(member.organizationId, organizationId));
    const totalUsers = totalUsersResult[0]?.count || 0;

    // Get total documents in organization
    const totalDocumentsResult = await db
      .select({ count: count() })
      .from(file)
      .where(eq(file.organizationId, organizationId));
    const totalDocuments = totalDocumentsResult[0]?.count || 0;

    // Get total chat for current period (last 30 days) from users in organization
    const totalChatsCurrentPeriodResult = await db
      .select({ count: count() })
      .from(chat)
      .innerJoin(agent, eq(agent.id, chat.agentId))
      .where(
        and(
          eq(agent.organizationId, organizationId),
          gte(chat.createdAt, thirtyDaysAgo),
        ),
      );
    const totalChatsCurrentPeriod =
      totalChatsCurrentPeriodResult[0]?.count || 0;

    // Get total chats for previous period (30-60 days ago) from users in organization
    const totalChatsPreviousPeriodResult = await db
      .select({ count: count() })
      .from(chat)
      .innerJoin(agent, eq(agent.id, chat.agentId))
      .where(
        and(
          eq(agent.organizationId, organizationId),
          gte(chat.createdAt, sixtyDaysAgo),
          lt(chat.createdAt, thirtyDaysAgo),
        ),
      );
    const totalChatsPreviousPeriod =
      totalChatsPreviousPeriodResult[0]?.count || 0;

    // Get total messages for current period (last 30 days) from users in organization
    const totalMessagesCurrentPeriodResult = await db
      .select({ count: count() })
      .from(message)
      .innerJoin(chat, eq(chat.id, message.chatId))
      .innerJoin(agent, eq(agent.id, chat.agentId))
      .where(
        and(
          eq(agent.organizationId, organizationId),
          eq(message.role, 'user'),
          gte(chat.createdAt, thirtyDaysAgo),
        ),
      );
    const totalMessagesCurrentPeriod =
      totalMessagesCurrentPeriodResult[0]?.count || 0;

    // Get total messages for previous period (30-60 days ago) from users in organization
    const totalMessagesPreviousPeriodResult = await db
      .select({ count: count() })
      .from(message)
      .innerJoin(chat, eq(chat.id, message.chatId))
      .innerJoin(agent, eq(agent.id, chat.agentId))
      .where(
        and(
          eq(agent.organizationId, organizationId),
          eq(message.role, 'user'),
          gte(chat.createdAt, sixtyDaysAgo),
          lt(chat.createdAt, thirtyDaysAgo),
        ),
      );
    const totalMessagesPreviousPeriod =
      totalMessagesPreviousPeriodResult[0]?.count || 0;

    // Get distinct active users for current period (last 30 days) in organization
    const totalActiveUsersCurrentPeriodResult = await db
      .select({ count: countDistinct(chat.userId) })
      .from(chat)
      .innerJoin(message, eq(message.chatId, chat.id))
      .innerJoin(member, eq(member.userId, chat.userId))
      .innerJoin(agent, eq(agent.id, chat.agentId))
      .where(
        and(
          eq(agent.organizationId, organizationId),
          gte(message.createdAt, thirtyDaysAgo),
        ),
      );
    const totalActiveUsersCurrentPeriod =
      totalActiveUsersCurrentPeriodResult[0]?.count || 0;

    // Get distinct active users for previous period (30-60 days ago) in organization
    const totalActiveUsersPreviousPeriodResult = await db
      .select({ count: countDistinct(chat.userId) })
      .from(chat)
      .innerJoin(message, eq(message.chatId, chat.id))
      .innerJoin(member, eq(member.userId, chat.userId))
      .where(
        and(
          eq(member.organizationId, organizationId),
          gte(message.createdAt, sixtyDaysAgo),
          lt(message.createdAt, thirtyDaysAgo),
        ),
      );
    const totalActiveUsersPreviousPeriod =
      totalActiveUsersPreviousPeriodResult[0]?.count || 0;

    // Get daily chat counts for the last 30 days
    const dailyChatCountsResult = await db
      .select({
        date: sql<string>`DATE(${chat.createdAt})`,
        count: count(),
      })
      .from(chat)
      .innerJoin(agent, eq(agent.id, chat.agentId))
      .where(
        and(
          eq(agent.organizationId, organizationId),
          gte(chat.createdAt, thirtyDaysAgo),
        ),
      )
      .groupBy(sql`DATE(${chat.createdAt})`)
      .orderBy(sql`DATE(${chat.createdAt})`);

    // Create a map of existing chat counts by date
    const chatCountMap = new Map<string, number>();
    dailyChatCountsResult.forEach((result) => {
      chatCountMap.set(result.date, result.count);
    });

    // Generate all dates for the last 30 days and fill in missing dates with 0 counts
    const dailyChatCounts: DailyCount[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      const count = chatCountMap.get(dateString) || 0;
      dailyChatCounts.push({ date: dateString, count });
    }

    // daily message counts
    const dailyMessageCountsResult = await db
      .select({
        date: sql<string>`DATE(${chat.createdAt})`,
        count: count(),
      })
      .from(message)
      .innerJoin(chat, eq(chat.id, message.chatId))
      .innerJoin(agent, eq(agent.id, chat.agentId))
      .where(
        and(
          eq(agent.organizationId, organizationId),
          eq(message.role, 'user'), // filter only for user queries, not the agent's response
          gte(chat.createdAt, thirtyDaysAgo),
        ),
      )
      .groupBy(sql`DATE(${chat.createdAt})`)
      .orderBy(sql`DATE(${chat.createdAt})`);

    // Create a map of existing chat counts by date
    const messageCountMap = new Map<string, number>();
    dailyMessageCountsResult.forEach((result) => {
      messageCountMap.set(result.date, result.count);
    });

    // Generate all dates for the last 30 days and fill in missing dates with 0 counts
    const dailyMessageCounts: DailyCount[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      const count = messageCountMap.get(dateString) || 0;
      dailyMessageCounts.push({ date: dateString, count });
    }

    // most recent messages by chat id
    const mostRecentChatMessages = db
      .select({
        chatId: message.chatId,
        messageDate: sql<Date>`MAX("message"."createdAt")`.as('messageDate'),
      })
      .from(message)
      .where(gte(message.createdAt, thirtyDaysAgo))
      .groupBy(message.chatId)
      .as('mostRecentChatMessages');

    // recent chats...
    const recentChats = await db
      .select({
        chatMetadata: {
          id: chat.id,
          createdAt: sql<string>`TO_CHAR("chat"."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI')`,
          title: chat.title,
          mostRecentMessageDate: sql<string>`TO_CHAR("mostRecentChatMessages"."messageDate" AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI')`,
        },
        agent: {
          id: agent.id,
          name: agent.name,
          avatar: agent.avatar,
        },
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      })
      .from(chat)
      .innerJoin(agent, eq(agent.id, chat.agentId))
      .innerJoin(user, eq(user.id, chat.userId))
      .innerJoin(
        mostRecentChatMessages,
        eq(mostRecentChatMessages.chatId, chat.id),
      )
      .where(eq(agent.organizationId, organizationId))
      .orderBy(desc(mostRecentChatMessages.messageDate))
      .limit(100);

    const metricsData: MetricsData = {
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
    };

    return NextResponse.json<ApiResponse<MetricsData>>({
      success: true,
      data: metricsData,
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: 'Failed to fetch metrics',
      },
      { status: 500 },
    );
  }
}
