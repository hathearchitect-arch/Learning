'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function NoOrganizationsCard() {
  return (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle>No Organizations Available</CardTitle>
        <CardDescription>
          You don&#39;t have access to any organizations yet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          To get started with our platform, please contact our support team who
          will help set up your organization and get you access.
        </p>
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => window.open('https://gocaddie.ai', '_blank')}
            className="w-full"
          >
            Contact Support
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
