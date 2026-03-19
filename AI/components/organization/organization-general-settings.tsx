import { CardContent } from '../ui/card';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import type { OrganizationConfigurationProps } from './organization-settings-tabs';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';

type OrganizationThemeSettingsProps = {
  organization: OrganizationConfigurationProps['organization'];
  organizationId: OrganizationConfigurationProps['organizationId'];
  setIsLoading: (b: boolean) => void;
  isLoading: boolean;
  setLogoS3Url: (s: string | null) => void;
  logoS3Url: string | null;
};

export default function OrganizationGeneralSettings({
  organization,
  organizationId,
  setIsLoading,
  isLoading,
  setLogoS3Url,
  logoS3Url,
}: OrganizationThemeSettingsProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);
  const timeoutRef = useRef(null);

  const removeLogo = async () => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/auth/organization/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            logoS3Key: '',
          },
          organizationId,
        }),
      });
      console.log('remove logo response: ', response);
      if (!response.ok) {
        throw new Error('Failed to remove logo');
      }

      toast.success('Organization logo removed successfully');
      setLogoS3Url(null);
      router.refresh();
      window.location.reload();
    } catch (error) {
      console.error('Error removing logo:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove logo',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <CardContent>
        {logoS3Url ? (
          <div>
            <Label className="text-sm font-medium">Logo</Label>
            <div className="relative h-20 w-20 rounded-lg border overflow-hidden">
              <Image
                src={logoS3Url ? logoS3Url : 'invalid-url'}
                alt="Current organization logo"
                unoptimized={true}
                fill
                className="object-cover"
              />
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={removeLogo}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              Remove Logo
            </Button>
          </div>
        ) : (
          <div>
            <Label className="text-sm font-medium">No Uploaded Logo</Label>
            <div>
              <span className="text-sm text-muted-foreground">
                Upload a logo using the Edit button
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </>
  );
}
