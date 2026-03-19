'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardFooter,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AuthHeader } from '@/components/auth-header';
import { useLayoutLogoData } from '../../layout-logo-context';

export default function ConfirmSignupPage() {
  const logoData = useLayoutLogoData();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <AuthHeader logoData={logoData} />
        <Card className="mt-6">
          <CardHeader className="text-center">
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We sent you a verification link to confirm your account.
            </CardDescription>
          </CardHeader>
          <CardFooter className={'flex flex-col gap-4 mt-4'}>
            <p className="text-muted-foreground text-xs">Having trouble? </p>
            <Link
              href="https://gocaddie.ai"
              target="_blank"
              className="flex w-full justify-center"
            >
              <Button variant="outline" className="w-full">
                <span>Contact Support</span>
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
