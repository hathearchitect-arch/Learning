'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ImageIcon, Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { Agent } from '@/lib/db/types';

const logoSchema = z.object({
  logo: z.instanceof(File).optional(),
});

type LogoFormData = z.infer<typeof logoSchema>;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface AgentLogoFormProps {
  agent: Agent;
}

export function AgentLogoForm({ agent }: AgentLogoFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<LogoFormData>({
    resolver: zodResolver(logoSchema),
    defaultValues: {
      logo: undefined,
    },
  });

  // Load current logo URL on mount
  useEffect(() => {
    if (agent.logoS3Key) {
      // Fetch the current logo URL
      fetchLogoUrl(agent.logoS3Key);
    }
  }, [agent.logoS3Key]);

  const fetchLogoUrl = async (s3Key: string) => {
    try {
      const response = await fetch(
        `/api/agent/${agent.id}/logo?s3Key=${encodeURIComponent(s3Key)}`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCurrentLogoUrl(data.data.url);
        }
      }
    } catch (error) {
      console.error('Error fetching logo URL:', error);
    }
  };

  const handleFileChange = (file: File | undefined) => {
    if (file) {
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

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
    } else {
      setPreviewUrl(null);
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      setIsUploading(true);

      // Get presigned URL for upload
      const presignedResponse = await fetch(
        `/api/agent/${agent.id}/logo/upload`,
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

  const onSubmit = async (data: LogoFormData) => {
    try {
      setIsLoading(true);

      let s3Key: string | null = null;

      if (data.logo) {
        s3Key = await uploadLogo(data.logo);
      }

      // Update agent with new logo
      const response = await fetch(`/api/agent/${agent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logoS3Key: s3Key,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update agent logo');
      }

      const result: ApiResponse<Agent> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update agent logo');
      }

      toast.success('Agent logo updated successfully');

      // Clear preview and form
      setPreviewUrl(null);
      form.reset();

      // Update current logo URL
      if (s3Key) {
        fetchLogoUrl(s3Key);
      } else {
        setCurrentLogoUrl(null);
      }

      router.refresh();
    } catch (error) {
      console.error('Error updating agent logo:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update agent logo',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const removeLogo = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(`/api/agent/${agent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logoS3Key: null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove agent logo');
      }

      const result: ApiResponse<Agent> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to remove agent logo');
      }

      toast.success('Agent logo removed successfully');
      setCurrentLogoUrl(null);
      router.refresh();
    } catch (error) {
      console.error('Error removing agent logo:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove agent logo',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Agent Logo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Current Logo Display */}
            {currentLogoUrl && (
              <div className="space-y-2">
                <FormLabel>Current Logo</FormLabel>
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 rounded-lg border overflow-hidden">
                    <Image
                      src={currentLogoUrl}
                      alt="Current agent logo"
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
              </div>
            )}

            {/* File Upload */}
            <FormField
              control={form.control}
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
                          handleFileChange(file);
                        }}
                        className="cursor-pointer"
                        disabled={isLoading || isUploading}
                      />

                      {/* Preview */}
                      {previewUrl && (
                        <div className="space-y-2">
                          <FormLabel>Preview</FormLabel>
                          <div className="relative h-24 w-24 rounded-lg border overflow-hidden">
                            <Image
                              src={previewUrl}
                              alt="Logo preview"
                              fill
                              className="object-cover"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Upload a logo image for your agent (JPEG, PNG, WebP, or SVG,
                    max 5MB)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isLoading || isUploading || !form.watch('logo')}
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
      </CardContent>
    </Card>
  );
}
