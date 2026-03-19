import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const logoSchema = z.object({
  logo: z.instanceof(File).optional(),
});
type LogoFormData = z.infer<typeof logoSchema>;

type OrganizationLogoUploadFormProps = {
  organizationId: string;
  setIsUploading: (b: boolean) => void;
  isUploading: boolean;
  setIsLoading: (b: boolean) => void;
  isLoading: boolean;
  setLogoS3Url: (s: string | null) => void;
};

export default function OrganizationLogoUploadForm({
  organizationId,
  setIsUploading,
  isUploading,
  setIsLoading,
  isLoading,
  setLogoS3Url,
}: OrganizationLogoUploadFormProps) {
  const router = useRouter();
  const logoForm = useForm<LogoFormData>({
    resolver: zodResolver(logoSchema),
    defaultValues: {
      logo: undefined,
    },
  });

  const handleLogoFileChange = (file: File | undefined) => {
    if (file) {
      // Validate file type
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/svg+xml',
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error(
          'Please select a valid image file (JPEG, PNG, WebP, or SVG)',
        );
        return;
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('File size must be less than 5MB');
        return;
      }
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      setIsUploading(true);

      // Get presigned URL for upload
      const presignedResponse = await fetch(
        `/api/auth/organization/${organizationId}/logo`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
          }),
        },
      );

      if (!presignedResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const presignedData = await presignedResponse.json();
      if (!presignedData.success) {
        throw new Error(presignedData.error || 'Failed to get upload URL');
      }

      // Upload file to S3
      const uploadResponse = await fetch(presignedData.data.presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }
      return presignedData.data.s3Key;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const onLogoFormSubmit = async (data: LogoFormData) => {
    try {
      setIsLoading(true);

      let s3Key: string | null = null;

      if (data.logo) {
        s3Key = await uploadLogo(data.logo);
      }

      // Update organization with new logo
      const response = await fetch('/api/auth/organization/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            logoS3Key: s3Key,
          },
          organizationId,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to update organization logo');
      }

      toast.success('Organization logo updated successfully');

      // Clear preview and form
      logoForm.reset();

      //update logo on page
      fetchLogoUrl(s3Key || '');

      router.refresh();
      window.location.reload();
    } catch (error) {
      console.error('Error updating organization logo:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update organization logo',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogoUrl = async (s3Key: string) => {
    console.log('fetching logo url with s3Key: ', s3Key);
    try {
      const response = await fetch(
        `/api/auth/organization/${organizationId}/logo`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLogoS3Url(data.data.logoUrl);
        }
      }
    } catch (error) {
      console.error('Error fetching logo URL:', error);
    }
  };

  return (
    <>
      <Form {...logoForm}>
        <form
          onSubmit={logoForm.handleSubmit(onLogoFormSubmit)}
          className="space-y-4"
        >
          <FormField
            control={logoForm.control}
            name="logo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Upload New Logo</FormLabel>
                <FormControl>
                  <div className="space-y-4">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        field.onChange(file);
                        handleLogoFileChange(file);
                      }}
                      className="cursor-pointer"
                      disabled={isLoading || isUploading}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Upload a logo image for your organization (JPEG, PNG, WebP, or
                  SVG, max 5MB)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            disabled={isLoading || isUploading || !logoForm.watch('logo')}
            className="w-full"
          >
            {isLoading || isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {isUploading ? 'Uploading...' : 'Updating...'}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Logo
              </>
            )}
          </Button>
        </form>
      </Form>
    </>
  );
}
