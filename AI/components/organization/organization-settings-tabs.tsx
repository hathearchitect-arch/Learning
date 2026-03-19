'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
import OrganizationGeneralSettings from './organization-general-settings';
import OrganizationSigninBrandingSettings from './organization-signin-branding';
import OrganizationAdvancedSettings from './organization-advanced-settings';
import OrganizationLogoUploadForm from './organization-logo-upload-form';
import OrganizationEditLoginBrandingForm from './organization-edit-login-branding-form';
import OrganizationEditAdvancedForm from './organization-edit-advanced-form';

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

export function OrganizationSettingsTabs({
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

  return (
    <div>
      <Tabs defaultValue="general" className="mb-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="signin-branding">Signin Theme</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        <div className="mt-6">
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <IconAdjustmentsCog />
                      General
                    </CardTitle>
                    <CardDescription>Upload organization logo</CardDescription>
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
                        <DialogTitle>Edit Organization Logo</DialogTitle>
                      </DialogHeader>
                      <OrganizationLogoUploadForm
                        organizationId={organizationId}
                        setIsUploading={setIsUploading}
                        isUploading={isUploading}
                        setIsLoading={setIsLoading}
                        isLoading={isLoading}
                        setLogoS3Url={setLogoS3Url}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <OrganizationGeneralSettings
                  organization={organization}
                  organizationId={organizationId}
                  setIsLoading={setIsLoading}
                  isLoading={isLoading}
                  setLogoS3Url={setLogoS3Url}
                  logoS3Url={logoS3Url}
                />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="signin-branding">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <IconAdjustmentsCog />
                      Signin Theme
                    </CardTitle>
                    <CardDescription>
                      Customize branding/styling on signin pages (signin,
                      signup, forgot password, etc.)
                    </CardDescription>
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
                        <DialogTitle>Edit Signin Branding</DialogTitle>
                        <DialogDescription>
                          Customize font and light/dark theme
                        </DialogDescription>
                      </DialogHeader>
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
                <OrganizationSigninBrandingSettings
                  organization={organization}
                  organizationId={organizationId}
                />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="advanced">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <IconAdjustmentsCog />
                      Advanced
                    </CardTitle>
                    <CardDescription>
                      Configure help link in chat and custom metadata filtering
                    </CardDescription>
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
                        <DialogTitle>Edit Advanced Settings</DialogTitle>
                        <DialogDescription>Configure the</DialogDescription>
                      </DialogHeader>
                      <OrganizationEditAdvancedForm
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
                <OrganizationAdvancedSettings organization={organization} />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
