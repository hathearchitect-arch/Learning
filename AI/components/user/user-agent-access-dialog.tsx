'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { MultiSelect, type Option } from '@/components/ui/multi-select';
import { Loader2, Shield, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { UserItemSchema } from '@/components/user/user-data-table-columns';
import { Alert, AlertDescription } from '@/components/ui/alert';

const agentAccessSchema = z.object({
  agentIds: z.array(z.string()),
});

type AgentAccessFormData = z.infer<typeof agentAccessSchema>;

interface Agent {
  id: string;
  name: string;
  avatar?: string;
  logoS3Key?: string;
  isActive: boolean;
}

interface UserAgentAccessDialogProps {
  user: UserItemSchema;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserAgentAccessDialog({
  user,
  open,
  onOpenChange,
}: UserAgentAccessDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const router = useRouter();

  const form = useForm<AgentAccessFormData>({
    resolver: zodResolver(agentAccessSchema),
    defaultValues: {
      agentIds: [],
    },
  });

  // Fetch agents when dialog opens (we still need all agents, not just the ones user has access to)
  useEffect(() => {
    if (open) {
      fetchAgents();
    }
  }, [open]);

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all agents in the organization
      const agentsResponse = await fetch('/api/agent');
      const agentsData = await agentsResponse.json();

      if (agentsData.success) {
        const allAgents = agentsData.data;
        setAgents(allAgents);

        // Set initial form values based on user's current agent access
        const currentAgentIds =
          user.agentAccess
            ?.filter((access) => access.isActive)
            .map((access) => access.id) || [];

        form.reset({
          agentIds: currentAgentIds,
        });
      } else {
        toast.error('Failed to load agents');
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast.error('Failed to load agent data');
    } finally {
      setIsLoading(false);
    }
  }, [user.agentAccess, form]);

  // Fetch agents when dialog opens (we still need all agents, not just the ones user has access to)
  useEffect(() => {
    if (open) {
      fetchAgents();
    }
  }, [open, fetchAgents]);

  const onSubmit = async (data: AgentAccessFormData) => {
    setIsSaving(true);
    try {
      // Get the current access state and the new desired state
      const currentAccess = new Set(
        user.agentAccess
          ?.filter((access) => access.isActive)
          .map((access) => access.id) || [],
      );

      const newAccess = new Set(data.agentIds);

      // Find agents to add (in newAccess but not in currentAccess)
      const agentsToAdd = Array.from(newAccess).filter(
        (agentId) => !currentAccess.has(agentId),
      );

      // Find agents to remove (in currentAccess but not in newAccess)
      const agentsToRemove = Array.from(currentAccess).filter(
        (agentId) => !newAccess.has(agentId),
      );

      // Process removals first
      for (const agentId of agentsToRemove) {
        const response = await fetch(`/api/agent/${agentId}/users`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.userId,
            email: user.email,
          }),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(`Failed to remove access to agent: ${result.error}`);
        }
      }

      // Process additions
      for (const agentId of agentsToAdd) {
        const response = await fetch(`/api/agent/${agentId}/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: user.email,
            isActive: user.status === 'active',
          }),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(`Failed to add access to agent: ${result.error}`);
        }
      }

      toast.success('Agent access updated successfully');
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating agent access:', error);
      toast.error('Failed to update agent access', {
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="size-5" />
              Agent Access - {user.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            Agent Access - {user.name}
          </DialogTitle>
          <DialogDescription>
            Control which agents {user.name} can access and use within the
            organization.
            {user.status !== 'active' &&
              ' Agent access will be granted when they join the organization.'}
          </DialogDescription>
        </DialogHeader>

        {user.status !== 'active' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This user has not yet joined the organization. Agent access will
              be granted once they accept their invitation.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {agents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="size-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No agents available</p>
                <p className="text-xs">
                  Create an agent first to grant access to users.
                </p>
              </div>
            ) : (
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
                        placeholder="Select agents to grant access to..."
                        disabled={isLoading}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || agents.length === 0}>
                {isSaving && <Loader2 className="size-4 mr-2 animate-spin" />}
                Update Access
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
