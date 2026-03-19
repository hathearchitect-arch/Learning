'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { organization, useSession } from '@/lib/auth-client';

const formSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: 'Organization name must be at least 2 characters.',
    })
    .max(50, {
      message: 'Organization name must not exceed 50 characters.',
    }),
});

interface OrganizationCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrganizationCreateDialog({
  open,
  onOpenChange,
}: OrganizationCreateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });

  const { data: session } = useSession();

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (session?.user?.role !== 'admin') {
      toast.error('You do not have permission to create an organization.');
      return;
    }
    setIsSubmitting(true);
    const { name } = values;
    const slug = name.replace(/\s+/g, '-').toLowerCase();

    // add a random 4 characters alphanumeric suffix to the slug
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const uniqueSlug = `${slug}-${randomSuffix}`;

    // Check if organization with the same slug already exists
    // status will return true if the slug is available
    const { data: status } = await organization.checkSlug({ slug: uniqueSlug });

    if (!status) {
      toast.error('An organization with this name already exists.');
      setIsSubmitting(false);
      return;
    }

    const newOrganization = await organization.create({
      name: name,
      slug: uniqueSlug,
      logo: `https://avatar.vercel.sh/${uniqueSlug}.svg`,
    });

    console.log('New Organization Created:', newOrganization);

    toast.success(`Organization "${name}" created successfully!`);
    setIsSubmitting(false);
    onOpenChange(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Inc" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || session?.user?.role !== 'admin'}
              >
                {isSubmitting ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
