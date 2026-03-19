import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { DialogFooter } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { OrganizationConfigurationProps } from './organization-settings-tabs';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';

const organizationConfigSchema = z.object({
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

type OrganizationEditSettingsFormProps = {
  organization: OrganizationConfigurationProps['organization'];
  organizationId: OrganizationConfigurationProps['organizationId'];
  setIsSaving: (b: boolean) => void;
  isSaving: boolean;
  setIsOpen: (b: boolean) => void;
};

export default function OrganizationEditAdvancedForm({
  organization,
  organizationId,
  setIsSaving,
  isSaving,
  setIsOpen,
}: OrganizationEditSettingsFormProps) {
  const router = useRouter();
  const mainForm = useForm<OrganizationConfigFormData>({
    resolver: zodResolver(organizationConfigSchema),
    defaultValues: {
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

  const handleUpdateOrganization = async (data: OrganizationConfigFormData) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/auth/organization/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            chatHelpUrl: data.chatHelpUrl,
            customMetadataFilterConfig: data.customMetadataFilterConfig,
          },
          organizationId,
        }),
      });

      if (response.ok) {
        setIsOpen(false);
        toast.success('Configuration updated', {
          description:
            'Organization configuration has been saved successfully.',
        });
      } else {
        console.log(response);
        toast.error('Failed to save configuration', {
          description: 'An unexpected error occurred.',
        });
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsSaving(false);
      router.refresh();
    }
  };

  const handleCancel = () => {
    mainForm.reset({
      chatHelpUrl: 'caddie/help',
      customMetadataFilterConfig: organization.customMetadataFilterConfig || {},
    });
    setIsOpen(false);
  };

  return (
    <>
      <Form {...mainForm}>
        <form
          onSubmit={mainForm.handleSubmit(handleUpdateOrganization)}
          className="space-y-4 py-4"
        >
          <FormField
            control={mainForm.control}
            name="chatHelpUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Help Link</FormLabel>
                <FormControl>
                  <Input placeholder="" {...field} />
                </FormControl>
                <FormMessage />
                <FormDescription>
                  {'Link users are directed to by the "Help" button in chat'}
                </FormDescription>
              </FormItem>
            )}
          />
          <FormField
            control={mainForm.control}
            name="customMetadataFilterConfig"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custom Metadata Filtering Config</FormLabel>
                <FormControl>
                  <Textarea
                    rows={4}
                    placeholder={JSON.stringify(
                      organization.customMetadataFilterConfig,
                      null,
                      4,
                    )}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
                <FormDescription>
                  Parameters used for customer metadata filtering: must provide
                  an endpoint and any necessary authentication to access it
                </FormDescription>
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
