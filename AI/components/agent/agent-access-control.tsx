'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, UserPlus, Trash2, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useActiveOrganization } from '@/lib/auth-client';

const accessControlSchema = z.object({
  email: z.string().email('Valid email address is required'),
});

type AccessControlFormData = z.infer<typeof accessControlSchema>;

type AgentUser = {
  id: string;
  agentId: string;
  userId: string | null;
  inviteEmail: string | null;
  inviteStatus: 'pending' | 'accepted';
  isActive: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  } | null;
};

type Agent = {
  id: string;
  name: string;
  // Add other agent properties as needed
};

interface AccessControlProps {
  agent: Agent;
}

export function AccessControl({ agent }: AccessControlProps) {
  const [agentUsers, setAgentUsers] = useState<AgentUser[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { data: activeOrganization } = useActiveOrganization();

  const form = useForm<AccessControlFormData>({
    resolver: zodResolver(accessControlSchema),
    defaultValues: {
      email: '',
    },
  });

  // Fetch agent users and available members
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch current agent users
      const usersResponse = await fetch(`/api/agent/${agent.id}/users`);
      let usersData: any[] = [];

      if (usersResponse.ok) {
        const { data: users } = await usersResponse.json();
        usersData = users || [];
        setAgentUsers(usersData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data', {
        description: 'Unable to fetch agent users.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [agent.id]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onSubmit = async (data: AccessControlFormData) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/agent/${agent.id}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          isActive: true,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsOpen(false);
        form.reset();
        toast.success('Access granted', {
          description:
            'User has been granted access to this agent, or an invitation has been sent.',
        });
        // Refresh data
        await fetchData();
        router.refresh();
      } else {
        toast.error('Failed to grant access', {
          description: result.error || 'An unexpected error occurred.',
        });
      }
    } catch (error) {
      console.error('Error granting access:', error);
      toast.error('Failed to grant access', {
        description: 'An unexpected error occurred.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveAccess = async (entryId: string) => {
    setIsDeleting(entryId);
    try {
      // Find the agent user to determine what identifier to use
      const agentUser = agentUsers.find((au) => au.id === entryId);
      if (!agentUser) {
        toast.error('User not found');
        return;
      }

      // Prepare the request body with either userId or email
      const requestBody: { userId?: string; email?: string } = {};
      if (agentUser.userId) {
        requestBody.userId = agentUser.userId;
      } else if (agentUser.inviteEmail) {
        requestBody.email = agentUser.inviteEmail;
      } else {
        toast.error('Unable to identify user to remove');
        return;
      }

      const response = await fetch(`/api/agent/${agent.id}/users`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Access removed', {
          description: 'User access has been removed successfully.',
        });
        // Refresh data
        await fetchData();
        router.refresh();
      } else {
        toast.error('Failed to remove access', {
          description: result.error || 'An unexpected error occurred.',
        });
      }
    } catch (error) {
      console.error('Error removing access:', error);
      toast.error('Failed to remove access', {
        description: 'An unexpected error occurred.',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            Access Control
          </CardTitle>
          <CardDescription>
            Manage who can access and use this agent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-5" />
              Access Control
            </CardTitle>
            <CardDescription>
              Manage who can access and use this agent
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <UserPlus className="size-4 mr-2" />
                Grant Access
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Grant Agent Access</DialogTitle>
                <DialogDescription>
                  Give an organization member access to this agent.
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Enter email address"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter the email of a user to grant access. If the user
                          exists in the organization, they&apos;ll get immediate
                          access. If not, they&apos;ll receive an invitation
                          when they sign up.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving && (
                        <Loader2 className="size-4 mr-2 animate-spin" />
                      )}
                      Grant Access
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {agentUsers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentUsers.map((agentUser) => (
                <TableRow key={agentUser.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="size-4" />
                      <span className="font-medium">
                        {agentUser.user?.name ||
                          agentUser.inviteEmail ||
                          'Unknown'}
                      </span>
                      {agentUser.inviteStatus === 'pending' && (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {agentUser.user?.email || agentUser.inviteEmail}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={agentUser.isActive ? 'default' : 'secondary'}
                    >
                      {agentUser.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(agentUser.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAccess(agentUser.id)}
                      disabled={isDeleting === agentUser.id}
                    >
                      {isDeleting === agentUser.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="size-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No users have access to this agent</p>
            <p className="text-xs">
              Grant access to organization members to get started
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
