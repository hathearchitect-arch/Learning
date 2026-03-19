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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { OrganizationConfigurationProps } from './organization-settings-tabs';
import { fontSelector, getFontClassName } from '@/lib/theme/fonts';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const organizationConfigSchema = z.object({
  name: z.string(),
  font: z.string(),
  theme: z.string(),
});

type OrganizationConfigFormData = z.infer<typeof organizationConfigSchema>;

type OrganizationEditSettingsFormProps = {
  organization: OrganizationConfigurationProps['organization'];
  organizationId: OrganizationConfigurationProps['organizationId'];
  setIsSaving: (b: boolean) => void;
  isSaving: boolean;
  setIsOpen: (b: boolean) => void;
};

export default function OrganizationEditLoginBrandingForm({
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
      name: organization.name ? organization.name : undefined,
      font: organization.font || 'Inter',
      theme: organization.theme || 'light',
    },
  });

  const fontOptions: string[] = Object.keys(fontSelector);

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
            font: data.font,
            theme: data.theme.toLowerCase(),
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
      name: organization.name ? organization.name : undefined,
      font: organization.font || 'Inter',
      theme: organization.theme || 'light',
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
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={mainForm.control}
              name="font"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Font Family</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fontOptions.map((font) => (
                        <SelectItem
                          key={font}
                          value={font}
                          className={getFontClassName(font)}
                        >
                          {font}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Font used for all text throughout the interface
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={mainForm.control}
              name="theme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Theme</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
