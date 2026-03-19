import { CardContent } from '../ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import type { OrganizationConfigurationProps } from './organization-settings-tabs';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Input } from '../ui/input';

type OrganizationThemeSettingsProps = {
  organization: OrganizationConfigurationProps['organization'];
  organizationId: OrganizationConfigurationProps['organizationId'];
};

export default function OrganizationSigninBrandingSettings({
  organization,
  organizationId,
}: OrganizationThemeSettingsProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [organizationSigninLink, setOrganizationSigninLink] =
    useState<string>('');
  const inputRef = useRef(null);
  const timeoutRef = useRef(null);

  const handleCopy = () => {
    if (inputRef.current) {
      if (navigator.clipboard) {
        navigator.clipboard
          .writeText(organizationSigninLink)
          .then(() => {
            setCopied(true);
            // @ts-ignore
            timeoutRef.current = setTimeout(() => {
              setCopied(false);
            }, 2000);
          })
          .catch((err) => {
            console.error('Failed to copy text: ', err);
          });
      }
    }
  };

  useEffect(() => {
    //first store org signin link client-side
    setOrganizationSigninLink(
      `${window.location.href.replace(window.location.pathname, '')}/signin?organizationId=${organizationId}`,
    );

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <CardContent>
        <div className="mb-6">
          <Label className="text-sm font-medium">Link to themed signin:</Label>
          <Input
            type="text"
            value={organizationSigninLink}
            readOnly
            ref={inputRef}
            className="flex-1 font-mono text-sm border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
          />
          <Button
            onClick={handleCopy}
            variant="secondary"
            className="relative group overflow-hidden"
          >
            {copied ? (
              <span className="text-sm font-medium transition-transform duration-300 ease-in-out transform group-hover:scale-105">
                Copied!
              </span>
            ) : (
              <div className="flex items-center space-x-2 transition-transform duration-300 ease-in-out transform group-hover:scale-105">
                <Copy className="h-4 w-4" />
                <span className="text-sm font-medium">Copy</span>
              </div>
            )}
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-sm font-medium">Font</Label>
            <div>
              <span className="text-sm text-muted-foreground">
                {organization.font || 'Inter'}
              </span>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Theme</Label>
            <div>
              <span className="text-sm text-muted-foreground">
                {organization.theme
                  ? organization.theme.charAt(0).toUpperCase() +
                    organization.theme.slice(1)
                  : 'Light'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </>
  );
}
