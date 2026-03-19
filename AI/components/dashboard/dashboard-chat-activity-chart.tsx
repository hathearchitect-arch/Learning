'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, Tooltip } from 'recharts';

import { useIsMobile } from '@/hooks/use-mobile';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { type ChartConfig, ChartContainer } from '@/components/ui/chart';
import { format, subDays } from 'date-fns';

const chartConfig = {
  date: {
    label: 'Visitors',
  },
  messages: {
    label: 'Desktop',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

type MessageData = {
  date: string;
  count: number;
};

export function ChatActivityChart({
  data,
  totalMessages,
}: { data: MessageData[]; totalMessages: number }) {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState('30d');

  // Create a map of dates to counts
  const dateCountMap = new Map(data.map((item) => [item.date, item.count]));

  // Generate data for all days in the last 30 days
  const chartData = Array.from({ length: 30 }, (_, i) => {
    const date = format(subDays(new Date(), 29 - i), 'yyyy-MM-dd');
    return {
      date,
      messages: dateCountMap.get(date) || 0,
    };
  });

  // console.log('chartData', chartData);

  return (
    <Card className="@container/card">
      <CardHeader>
        <div className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Chat Activity</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2 font-medium leading-none">
              Total messages: {` ${totalMessages}`}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <BarChart data={chartData}>
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
              }}
            />
            <CartesianGrid
              strokeDasharray="4"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid grid-cols gap-2">
                        <div className="flex flex-row items-center gap-2">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Chats
                          </span>
                          <span className="font-bold">{payload[0].value}</span>
                        </div>
                        <div className="flex flex-row items-center gap-2">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Date
                          </span>
                          <span className="font-bold text-muted-foreground">
                            {format(
                              new Date(payload[0].payload.date),
                              'MMM d, yyyy',
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="messages"
              radius={[4, 4, 0, 0]}
              fill="hsl(var(--primary))"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
