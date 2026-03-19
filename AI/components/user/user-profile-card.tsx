'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type User = {
  name: string;
  email: string;
  image?: string | null;
};

interface UserProfileCardProps {
  user: User;
  onSignOut?: () => void;
  isSigningOut?: boolean;
}

export function UserProfileCard({
  user,
  onSignOut,
  isSigningOut: externalIsSigningOut,
}: UserProfileCardProps) {
  const [internalIsSigningOut, setInternalIsSigningOut] = useState(false);
  const router = useRouter();
  const isSigningOut = externalIsSigningOut ?? internalIsSigningOut;

  const handleSignOut = async () => {
    router.push('/signin'); // Redirect to login page
    await signOut(); // sign out the user
    toast.success('Logged out successfully');
  };

  return (
    <Card className="w-[400px]">
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Image
              src={user.image || `https://avatar.vercel.sh/${user.name}.svg`}
              alt={`${user.name} avatar`}
              width={48}
              height={48}
              className="rounded-full"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{user.name}</h3>
            <p className="text-sm text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? 'Signing out...' : 'Sign out'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
