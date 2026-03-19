'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const greetingSchema = z.object({
  greeting1: z
    .string()
    .min(1, 'First greeting message is required')
    .max(50, 'First greeting message must be less than 50 characters'),
  greeting2: z
    .string()
    .min(1, 'Second greeting message is required')
    .max(50, 'Second greeting message must be less than 50 characters'),
});

type GreetingFormData = z.infer<typeof greetingSchema>;

type Agent = {
  id: string;
  greeting?: string[];
};

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface AgentGreetingFormProps {
  agent: Agent;
}

export function AgentGreetingForm({ agent }: AgentGreetingFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  // Extract greeting values with defaults
  const greeting1 = agent.greeting?.[0] || '';
  const greeting2 = agent.greeting?.[1] || '';

  const form = useForm<GreetingFormData>({
    resolver: zodResolver(greetingSchema),
    defaultValues: {
      greeting1,
      greeting2,
    },
  });

  const onSubmit = async (data: GreetingFormData) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/agent/${agent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          greeting: [data.greeting1, data.greeting2],
        }),
      });

      const result: ApiResponse<Agent> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update greeting');
      }

      toast.success('Agent greeting updated successfully');
      router.refresh();
    } catch (error) {
      console.error('Error updating greeting:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update agent greeting',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Greeting
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="greeting1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Greeting Message</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Welcome! How can I help you today?"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The first line of your agents greeting message (max 50
                    characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="greeting2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Second Greeting Message</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="I'm here to assist you with any questions."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The second line of your agents greeting message (max 50
                    characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Greeting
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
