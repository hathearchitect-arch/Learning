'use client';

import { useState } from 'react';
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
import { Bot, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { avatarIcons } from '@/lib/avatar-icons';
import type { Agent } from '@/lib/db/types';

const avatarSchema = z.object({
  avatar: z.string().min(1, 'Please select an avatar icon'),
});

type AvatarFormData = z.infer<typeof avatarSchema>;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface AgentAvatarFormProps {
  agent: Agent;
}

export function AgentAvatarForm({ agent }: AgentAvatarFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<AvatarFormData>({
    resolver: zodResolver(avatarSchema),
    defaultValues: {
      avatar: agent.avatar || 'bot',
    },
  });

  const selectedAvatar = form.watch('avatar');

  const onSubmit = async (data: AvatarFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/agent/${agent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          avatar: data.avatar,
        }),
      });

      const result: ApiResponse<Agent> = await response.json();

      if (!result.success) {
        toast.error(result.error || 'Failed to update avatar');
        return;
      }

      toast.success('Avatar updated successfully');
      router.refresh();
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast.error('Failed to update avatar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Agent Avatar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="avatar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Avatar Icon</FormLabel>
                  <FormDescription>
                    Choose an icon that represents your AI agent
                  </FormDescription>
                  <FormControl>
                    <div className="grid grid-cols-4 gap-3">
                      {avatarIcons.map((avatarOption) => {
                        const IconComponent = avatarOption.icon;
                        const isSelected = field.value === avatarOption.name;

                        return (
                          <button
                            key={avatarOption.name}
                            type="button"
                            onClick={() => field.onChange(avatarOption.name)}
                            className={cn(
                              'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover:bg-muted',
                              isSelected
                                ? 'border-primary bg-primary/10'
                                : 'border-muted',
                            )}
                          >
                            <IconComponent className="h-6 w-6" />
                            <span className="text-xs font-medium">
                              {avatarOption.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Preview:</span>
                {selectedAvatar && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
                    {(() => {
                      const selectedIcon = avatarIcons.find(
                        (icon) => icon.name === selectedAvatar,
                      );
                      if (selectedIcon) {
                        const IconComponent = selectedIcon.icon;
                        return <IconComponent className="h-5 w-5" />;
                      }
                      return null;
                    })()}
                    <span className="text-sm font-medium">
                      {
                        avatarIcons.find((icon) => icon.name === selectedAvatar)
                          ?.label
                      }
                    </span>
                  </div>
                )}
              </div>

              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Avatar'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
