'use client';

import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  organization,
  useSession,
  useActiveOrganization,
} from '@/lib/auth-client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useRouter } from 'next/navigation';
import { MultiSelect, type Option } from '@/components/ui/multi-select';
import type { Agent } from '@/lib/db/types';

const addUserSchema = z
  .object({
    email: z.string().email({
      message: 'Please enter a valid email address.',
    }),
    role: z.enum(['member', 'admin'], {
      message: 'Please select a role.',
    }),
    sendInvite: z.boolean(),
    agentIds: z.array(z.string().uuid()).optional(),
  })
  .refine(
    (data) => {
      // If role is member, at least one agent must be selected
      if (
        data.role === 'member' &&
        (!data.agentIds || data.agentIds.length === 0)
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Members must have access to at least one agent.',
      path: ['agentIds'],
    },
  );

export function AddUserButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  const { data: session } = useSession();
  const { data: activeOrganization } = useActiveOrganization();

  const form = useForm<z.infer<typeof addUserSchema>>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      email: '',
      role: 'member',
      sendInvite: false,
      agentIds: [],
    },
  });

  const watchedRole = form.watch('role');

  // Fetch agents when the dialog opens
  React.useEffect(() => {
    if (open && activeOrganization?.id) {
      setIsLoadingAgents(true);
      fetch('/api/agent')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setAgents(data.data);
          } else {
            toast.error('Failed to load agents');
          }
        })
        .catch(() => {
          toast.error('Failed to load agents');
        })
        .finally(() => {
          setIsLoadingAgents(false);
        });
    }
  }, [open, activeOrganization?.id]);

  async function onSubmit(values: z.infer<typeof addUserSchema>) {
    setIsSubmitting(true);
    console.log('Submitting invite with values:', values);

    try {
      // Only invite the user to the organization if the role is admin
      if (values.role === 'admin') {
        await organization.inviteMember({
          email: values.email,
          //@ts-ignore
          role: values.role,
          organizationId: activeOrganization?.id,
          resend: true,
          sendInvite: values.sendInvite,
        });
      }

      // If the role is member and agent IDs are selected, add them to those agents
      if (
        values.role === 'member' &&
        values.agentIds &&
        values.agentIds.length > 0
      ) {
        console.log('Adding user to agents:', values.agentIds);

        // Add the user to each selected agent
        const agentPromises = values.agentIds.map(async (agentId) => {
          const response = await fetch(`/api/agent/${agentId}/users`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: values.email,
              isActive: true,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              `Failed to add user to agent: ${errorData.error || 'Unknown error'}`,
            );
          }

          return response.json();
        });

        await Promise.all(agentPromises);
      }

      toast.success('User invitation sent successfully!');
      form.reset();
      setOpen(false);
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error('Failed to invite user. Please try again.');
    } finally {
      setIsSubmitting(false);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <UserPlus className="size-4 mr-2" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>
            Add a new user to join your organization.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="user@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the email address of the user you want to invite.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Reset agent selection when role changes
                      if (value === 'admin') {
                        form.setValue('agentIds', []);
                      }
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the role for the invited user.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedRole === 'member' && (
              <FormField
                control={form.control}
                name="agentIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Access</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={agents.map(
                          (agent): Option => ({
                            label: agent.name,
                            value: agent.id,
                            disabled: !agent.isActive,
                          }),
                        )}
                        selected={field.value || []}
                        onChange={field.onChange}
                        placeholder={
                          isLoadingAgents
                            ? 'Loading agents...'
                            : 'Select agents to grant access to...'
                        }
                        disabled={isLoadingAgents}
                        className="w-full"
                      />
                    </FormControl>
                    <FormDescription>
                      Select which agents this member will have access to.
                      {agents.length === 0 && !isLoadingAgents && (
                        <span className="block text-muted-foreground mt-1">
                          No agents available in this organization.
                        </span>
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchedRole === 'admin' && (
              <FormField
                control={form.control}
                name="sendInvite"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Send Invitation Email</FormLabel>
                      <FormDescription>
                        Send an email invitation to the user.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding User...' : 'Add User'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
