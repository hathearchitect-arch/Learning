'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
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
import { Brain, Thermometer, Settings, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { availableModels, getModelIcon } from '@/lib/ai/models';
import { AgentAvatar } from '@/components/agent/agent-avatar';
import type { Agent } from '@/lib/db/types';

const agentConfigSchema = z.object({
  name: z
    .string()
    .min(1, 'Agent name is required')
    .max(100, 'Agent name must be less than 100 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters'),
  instructions: z
    .string()
    .min(10, 'System prompt must be at least 10 characters')
    .max(5000, 'System prompt must be less than 5000 characters'),
  modelId: z.string({
    required_error: 'Please select a model for your agent.',
  }),
  isActive: z.boolean(),
  temperature: z
    .number()
    .min(0, 'Temperature must be at least 0')
    .max(1, 'Temperature must be at most 1'),
});

type AgentConfigFormData = z.infer<typeof agentConfigSchema>;

interface AgentConfigurationProps {
  agent: Agent;
}

export function AgentConfiguration({ agent }: AgentConfigurationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const form = useForm<AgentConfigFormData>({
    resolver: zodResolver(agentConfigSchema),
    defaultValues: {
      name: agent.name,
      description: agent.description || '',
      instructions: agent.instructions,
      modelId: agent.modelId,
      isActive: agent.isActive,
      temperature: agent.temperature || 1.0,
    },
  });

  const handleUpdateAgent = async (data: AgentConfigFormData) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/agent/${agent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setIsOpen(false);
        toast.success('Configuration updated', {
          description: 'Agent configuration has been saved successfully.',
        });
      } else {
        toast.error('Failed to save configuration', {
          description: 'An unexpected error occurred.',
        });
      }
    } finally {
      setIsSaving(false);
      router.refresh();
    }
  };

  const handleCancel = () => {
    form.reset({
      name: agent.name,
      description: agent.description || '',
      instructions: agent.instructions,
      modelId: agent.modelId,
      isActive: agent.isActive,
      temperature: agent.temperature || 1.0,
    });
    setIsOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Configuration
            </CardTitle>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Agent Configuration</DialogTitle>
                <DialogDescription>
                  Update the basic settings and behavior of your agent
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleUpdateAgent)}
                  className="space-y-4 py-4"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Agent Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter agent name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Status</FormLabel>
                            <FormDescription>
                              {field.value
                                ? 'Agent is active'
                                : 'Agent is inactive'}
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
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter agent description"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="modelId"
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
                              const IconComponent = getModelIcon(
                                model.provider,
                              );
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
                    name="instructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>System Prompt</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter the system prompt that defines how your agent should behave..."
                            rows={8}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Define how your agent should behave and respond to
                          users
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="temperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Thermometer className="h-4 w-4" />
                          Temperature: {field.value}
                        </FormLabel>
                        <FormControl>
                          <div className="px-2">
                            <Slider
                              value={[field.value]}
                              onValueChange={(value) =>
                                field.onChange(value[0])
                              }
                              max={1}
                              min={0}
                              step={0.1}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>More Focused</span>
                              <span>More Creative</span>
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Lower values make the agent more focused and
                          deterministic, higher values make it more creative and
                          random.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Save Changes
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-sm font-medium">Agent Name</Label>
            <div className="flex items-center gap-2 mt-1">
              <AgentAvatar agent={agent} size="sm" />
              <p className="text-sm text-muted-foreground">{agent.name}</p>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium flex flex-col">Status</Label>
            {agent.isActive ? (
              <Badge variant="default">Active</Badge>
            ) : (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-sm font-medium">Model</Label>
            <div className="flex items-center gap-2 mt-1">
              {(() => {
                const currentModel = availableModels.find(
                  (m) => m.value === agent.modelId,
                );
                if (currentModel) {
                  const IconComponent = getModelIcon(currentModel.provider);
                  return (
                    <>
                      <IconComponent className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {currentModel.label}
                      </span>
                      {currentModel.isPremium && (
                        <Badge variant="secondary" className="text-xs">
                          Premium
                        </Badge>
                      )}
                    </>
                  );
                }
                return (
                  <span className="text-sm text-muted-foreground">
                    {agent.modelId}
                  </span>
                );
              })()}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                Temperature:
              </Label>
              <div>
                <span className="text-sm text-muted-foreground">
                  {(agent.temperature || 1.0).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Description</Label>
          <p className="text-sm text-muted-foreground">{agent.description}</p>
        </div>

        <div>
          <Label className="text-sm font-medium">System Prompt</Label>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {agent.instructions || 'No system prompt defined.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
