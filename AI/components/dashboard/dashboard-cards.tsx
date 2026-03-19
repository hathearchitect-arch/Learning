import { TrendingDownIcon, TrendingUpIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface SectionCardsProps {
  title: string;
  description: string;
  value: string;
  change?: string | undefined;
  changeType?: 'up' | 'down' | undefined;
}

export function SectionCards({ cards }: { cards: SectionCardsProps[] }) {
  return (
    <div className="md:grid-cols-2 xl:grid-cols-5 grid grid-cols-1 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="@container/card">
          <CardHeader className="relative">
            <CardDescription className="text-md">{card.title}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {card.value}
            </CardTitle>
            <div className="absolute right-4 top-4">
              {card.changeType ? (
                <Badge
                  variant="outline"
                  className="flex gap-1 rounded-lg text-xs"
                >
                  {card.changeType === 'up' ? (
                    <TrendingUpIcon className="size-3 text-emerald-400" />
                  ) : (
                    <TrendingDownIcon className="size-3 text-red-400" />
                  )}
                  {card.change}
                </Badge>
              ) : null}
            </div>
            <div className="text-muted-foreground text-sm">
              {card.description}
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
