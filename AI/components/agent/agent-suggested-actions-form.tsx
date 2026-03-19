'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Plus, Trash2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

const promptSchema = z.object({
  id: z.string().optional(),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(50, 'Title must be 50 characters or less'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(150, 'Description must be 150 characters or less'),
  action: z
    .string()
    .min(1, 'Action query is required')
    .max(500, 'Action query must be 500 characters or less'),
});

const formSchema = z.object({
  actions: z
    .array(promptSchema)
    .min(1, 'At least one action is required')
    .max(4, 'Maximum 4 actions allowed'),
});

type FormValues = z.infer<typeof formSchema>;

interface AgentSuggestedActionsFormProps {
  agentId: string;
  agentSuggestedActions?: Array<{
    id: string;
    title: string;
    description: string;
    action: string;
  }>;
}

export function AgentSuggestedActionsForm({
  agentId,
  agentSuggestedActions,
}: AgentSuggestedActionsFormProps) {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      actions:
        agentSuggestedActions && agentSuggestedActions.length > 0
          ? agentSuggestedActions.slice(0, 4).map((prompt) => ({
              id: prompt.id,
              title: prompt.title,
              description: prompt.description,
              action: prompt.action,
            }))
          : [
              {
                title: '',
                description: '',
                action: '',
              },
            ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'actions',
  });

  async function onSubmit(values: FormValues) {
    try {
      console.log('Form submitted with values:', values);

      values.actions = values.actions.map((action) => ({
        ...action,
        title: action.title.trim(),
        description: action.description.trim(),
        action: action.action.trim(),
      }));
      const existingIds =
        agentSuggestedActions?.map((action) => action.id) || [];
      const newActions = values.actions.filter((action) => !action.id);
      const updatedActions = values.actions.filter((action) => action.id);
      const updatedIds = updatedActions.map((action) => action.id);
      const deletedIds = existingIds.filter((id) => !updatedIds.includes(id));

      // Create new actions
      for (const action of newActions) {
        await fetch(`/api/agent/${agentId}/suggested-actions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: action.title,
            description: action.description,
            action: action.action,
          }),
        });
      }

      // update existing actions
      for (const action of updatedActions) {
        if (action.id) {
          await fetch(`/api/agent/${agentId}/suggested-actions/${action.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: action.id,
              title: action.title,
              description: action.description,
              action: action.action,
            }),
          });
        }
      }

      // delete removed actions
      for (const id of deletedIds) {
        await fetch(`/api/agent/${agentId}/suggested-actions/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      form.reset({
        actions: values.actions.map((action) => ({
          ...action,
          title: action.title.trim(),
          description: action.description.trim(),
          action: action.action.trim(),
        })),
      });
      router.refresh();

      toast.success('Chatbot actions saved successfully!', {
        description: `${values.actions.length} action${values.actions.length > 1 ? 's' : ''} configured for your chatbot.`,
      });
    } catch (error) {
      console.error('Failed to save actions:', error);
      toast.error('Failed to save actions', {
        description:
          'Please try again. If the problem persists, contact support.',
      });
    }
  }

  const addPrompt = () => {
    if (fields.length < 4) {
      append({
        title: '',
        description: '',
        action: '',
      });
    }
  };

  const removePrompt = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  return (
    <>
      {/* Preview Section */}
      <Card className="w-full border-none shadow-none">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {form.watch('actions').map((prompt, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
              <div key={index} className="p-4 border rounded-[--radius]">
                <h4 className="font-semibold mb-1">
                  {prompt.title || `Prompt ${index + 1}`}
                </h4>
                <p className="text-sm mb-2">
                  {prompt.description || 'No description provided'}
                </p>
                <p className="text-xs italic bg-secondary p-2 rounded-[--radius] flex items-center gap-2">
                  <MessageSquare className="size-4" />
                  {prompt.action
                    ? `"${prompt.action.slice(0, 100)}${prompt.action.length > 100 ? '...' : ''}"`
                    : 'No action query'}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Form Section */}
      <Card className="w-full border-none shadow-none">
        <CardHeader>
          <CardTitle>Configure Suggested Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-10">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-[--radius]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">
                        Suggested Action {index + 1}
                      </h3>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removePrompt(index)}
                          className="text-destructive hover:text-destructive hover:border-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name={`actions.${index}.title`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., Get Started Guide"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              A short, catchy title for the prompt
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`actions.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., Learn how to get started with our platform"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Brief description of what this prompt does
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name={`actions.${index}.action`}
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Action Query</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="e.g., Can you provide a step-by-step guide on how to get started with your platform? Include the most important features I should know about."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            The actual query that will be sent to the chatbot
                            when this action is selected
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                {fields.length < 4 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addPrompt}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Another Prompt ({fields.length}/4)
                  </Button>
                )}

                <div className="flex gap-2 sm:ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.reset()}
                  >
                    Reset
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Saving...' : 'Save Prompts'}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
