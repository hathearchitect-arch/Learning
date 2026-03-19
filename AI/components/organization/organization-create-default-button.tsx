'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { organization, useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { Rocket } from 'lucide-react';

interface CreateDefaultOrganizationButtonProps {
  className?: string;
  variant?:
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function CreateDefaultOrganizationButton({
  className,
  variant = 'default',
  size = 'default',
}: CreateDefaultOrganizationButtonProps) {
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  const handleCreateDefaultOrganization = async () => {
    if (!session?.user) {
      toast.error('You must be logged in to create an organization.');
      return;
    }

    setIsCreating(true);

    try {
      const organizationName = `${session.user.name}'s Organization`;

      const nameParts = session.user.name.split(' ');
      const slug =
        nameParts.length > 1
          ? `${nameParts[0][0]}${nameParts.slice(1).join('')}`
            .toLowerCase()
            .replace(/\s+/g, '')
          : session.user.name.toLowerCase().replace(/\s+/g, '');

      // Add a random 4 character suffix to ensure uniqueness
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      const uniqueSlug = `${slug}-${randomSuffix}`;

      // Check if organization with the same slug already exists
      const { data: isSlugAvailable, error } = await organization.checkSlug({
        slug: uniqueSlug,
      });

      console.log('Slug Availability:', { isSlugAvailable, error });

      console.log('Trying with new slug:', uniqueSlug);

      if (!isSlugAvailable) {
        // Try again with a new random suffix
        const newRandomSuffix = Math.random().toString(36).substring(2, 6);
        const newUniqueSlug = `${slug}-${newRandomSuffix}`;

        const { data: isNewSlugAvailable } = await organization.checkSlug({
          slug: newUniqueSlug,
        });

        if (!isNewSlugAvailable) {
          toast.error(
            'Unable to create default organization. Please try again.',
          );
          setIsCreating(false);
          return;
        }
      }

      // Create the organization - the user will automatically become the owner
      const newOrganization = await organization.create({
        name: organizationName,
        slug: uniqueSlug,
        logo: `https://avatar.vercel.sh/${uniqueSlug}.svg`,
      });

      console.log('Default Organization Created:', newOrganization);

      toast.success(`Default organization created successfully!`);

      // Redirect to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      console.error('Error creating default organization:', error);

      // Check if it's a permission error
      if (error instanceof Error && error.message.includes('permission')) {
        toast.error('You do not have permission to create an organization.');
      } else {
        toast.error('Failed to create default organization. Please try again.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Button
      onClick={handleCreateDefaultOrganization}
      disabled={isCreating}
      variant={variant}
      size={size}
      className={className}
    >
      <Rocket className="mr-2 h-4 w-4" />
      {isCreating ? 'Creating Organization...' : 'Create Organization'}
    </Button>
  );
}
