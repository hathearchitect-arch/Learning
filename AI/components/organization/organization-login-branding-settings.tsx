'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IconAdjustmentsCog } from '@tabler/icons-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import OrganizationThemeSettings from './organization-signin-branding';
import OrganizationChatSettings from './organization-advanced-settings';
import OrganizationLogoUploadForm from './organization-logo-upload-form';
import OrganizationEditLoginBrandingForm from './organization-edit-login-branding-form';

const organizationConfigSchema = z.object({
  name: z.string(),
  font: z.string(),
  theme: z.string(),
  chatHelpUrl: z.string(),
  customMetadataFilterConfig: z
    .string()
    .min(1)
    .refine((data) => {
      try {
        JSON.parse(data);
        return true;
      } catch {
        return false;
      }
    }),
});

type OrganizationConfigFormData = z.infer<typeof organizationConfigSchema>;

export type OrganizationConfigurationProps = {
  organization: {
    name: string | null;
    font: string | null;
    theme: string | null;
    customMetadataFilterConfig: any;
    chatHelpUrl: string | null;
    logoS3Key: string | null;
  };
  organizationId: string;
  initialLogoS3Url: string | null;
};

export function OrganizationConfiguration({
  organization,
  organizationId,
  initialLogoS3Url,
}: OrganizationConfigurationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [logoS3Url, setLogoS3Url] = useState<string | null>(initialLogoS3Url);
  const router = useRouter();

  const mainForm = useForm<OrganizationConfigFormData>({
    resolver: zodResolver(organizationConfigSchema),
    defaultValues: {
      name: organization.name ? organization.name : undefined,
      font: organization.font || 'Inter',
      theme: organization.theme || 'light',
      chatHelpUrl: organization?.chatHelpUrl
        ? organization.chatHelpUrl
        : 'https://gocaddie.ai',
      customMetadataFilterConfig:
        JSON.stringify(
          JSON.parse(organization.customMetadataFilterConfig),
          null,
          4,
        ) || '{}',
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IconAdjustmentsCog />
              Configuration
            </CardTitle>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Organization Configuration</DialogTitle>
                <DialogDescription>
                  Update the basic settings for your organization
                </DialogDescription>
              </DialogHeader>
              <OrganizationLogoUploadForm
                organizationId={organizationId}
                setIsUploading={setIsUploading}
                isUploading={isUploading}
                setIsLoading={setIsLoading}
                isLoading={isLoading}
                setLogoS3Url={setLogoS3Url}
              />
              <OrganizationEditLoginBrandingForm
                organization={organization}
                organizationId={organizationId}
                setIsSaving={setIsSaving}
                isSaving={isSaving}
                setIsOpen={setIsOpen}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <OrganizationThemeSettings
          organization={organization}
          organizationId={organizationId}
        />
        <OrganizationChatSettings organization={organization} />
      </CardContent>
    </Card>
  );
}
