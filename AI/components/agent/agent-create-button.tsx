'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { availableModels, getModelIcon } from '@/lib/ai/models';
import { useRouter } from 'next/navigation';

const agentFormSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: 'Agent name must be at least 2 characters.',
    })
    .max(50, {
      message: 'Agent name must not exceed 50 characters.',
    }),
  model: z.string({
    required_error: 'Please select a model for your agent.',
  }),
  description: z
    .string()
    .min(10, {
      message: 'Description must be at least 10 characters.',
    })
    .max(500, {
      message: 'Description must not exceed 500 characters.',
    }),
});

export function AgentCreateButton() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<z.infer<typeof agentFormSchema>>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: '',
      model: '',
      description: '',
    },
  });

  const router = useRouter();

  async function onSubmit(values: z.infer<typeof agentFormSchema>) {
    // Here you would typically send the data to your API
    setIsSubmitting(true);

    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // Ensure your API expects JSON
      },
      body: JSON.stringify({
        name: values.name,
        modelId: values.model,
        description: values.description,
      }),
    });

    if (!res.ok) {
      toast.error('Failed to create agent', {
        description: 'Please try again later.',
      });
      return;
    }

    toast('Agent created successfully!', {
      description: `Agent "${values.name}" has been created`,
    });

    const newAgent = await res.json();

    // Reset form and close dialog after successful submission
    form.reset();
    setOpen(false);
    router.push(`/dashboard/agents/${newAgent.data.id}`);
    setIsSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New Agent</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Set up a new AI agent by providing a name and description.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter agent name (e.g., Customer Support Bot)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This is the display name for your agent.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model for your agent">
                        {field.value && (
                          <div className="flex items-center gap-2">
                            {(() => {
                              const selectedModel = availableModels.find(
                                (m) => m.value === field.value,
                              );
                              if (selectedModel) {
                                const IconComponent = getModelIcon(
                                  selectedModel.provider,
                                );
                                return (
                                  <>
                                    <IconComponent className="h-4 w-4" />
                                    <span>{selectedModel.label}</span>
                                    <span className="flex flex-1 items-center">
                                      {selectedModel.isPremium && (
                                        <Badge
                                          variant="secondary"
                                          className="ml-1 text-xs"
                                        >
                                          Premium
                                        </Badge>
                                      )}
                                    </span>
                                  </>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => {
                        const IconComponent = getModelIcon(model.provider);
                        return (
                          <SelectItem
                            key={model.value}
                            value={model.value}
                            className="py-3"
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {model.label}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      • {model.provider}
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground truncate">
                                    {model.description}
                                  </span>
                                </div>
                              </div>
                              {model.isPremium && (
                                <Badge
                                  variant="secondary"
                                  className="ml-3 text-xs flex-shrink-0"
                                >
                                  Premium
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the AI model that will power your agent.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this agent does, its capabilities, and how it should behave..."
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide a short description of the agents purpose and
                    functionality.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Creating...' : 'Create Agent'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
