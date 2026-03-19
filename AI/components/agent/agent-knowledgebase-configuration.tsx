'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Database, Loader2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { AgentAccessibleDocuments } from '@/components/agent/agent-accessible-documents';

const knowledgebaseConfigSchema = z.object({
  isCustomMetadataFilteringEnabled: z.boolean(),
  maxResults: z
    .number()
    .min(1, 'Max results must be at least 1')
    .max(50, 'Max results must be at most 50'),
  minSimilarityScore: z
    .number()
    .min(0, 'Similarity threshold must be at least 0')
    .max(1, 'Similarity threshold must be at most 1'),
});

type KnowledgebaseConfigFormData = z.infer<typeof knowledgebaseConfigSchema>;

type Agent = {
  id: string;
  isToolKnowledgebaseEnabled: boolean;
  isCustomMetadataFilteringEnabled: boolean;
  toolKnowledgebaseSettings: {
    maxResults: number;
    minSimilarityScore: number;
  };
};

interface KnowledgebaseConfigurationProps {
  agent: Agent;
}

export function KnowledgebaseConfiguration({
  agent: initialAgent,
}: KnowledgebaseConfigurationProps) {
  const [agent, setAgent] = useState(initialAgent);
  const [isToolKnowledgebaseEnabled, setIsToolKnowledgebaseEnabled] = useState(
    agent.isToolKnowledgebaseEnabled,
  );
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isDisableDialogOpen, setIsDisableDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const router = useRouter();

  // Fetch folders when component mounts
  useEffect(() => {
    // No longer need to fetch folders here since it's handled in AgentAccessibleDocuments
  }, [agent.id]);

  const form = useForm<KnowledgebaseConfigFormData>({
    resolver: zodResolver(knowledgebaseConfigSchema),
    defaultValues: {
      isCustomMetadataFilteringEnabled: agent.isCustomMetadataFilteringEnabled,
      maxResults: agent.toolKnowledgebaseSettings.maxResults,
      minSimilarityScore: agent.toolKnowledgebaseSettings.minSimilarityScore,
    },
  });

  const handleSwitchChange = (checked: boolean) => {
    if (checked) {
      // Enable KB - open configuration dialog
      form.reset({
        isCustomMetadataFilteringEnabled:
          agent.isCustomMetadataFilteringEnabled,
        maxResults: agent.toolKnowledgebaseSettings.maxResults,
        minSimilarityScore: agent.toolKnowledgebaseSettings.minSimilarityScore,
      });
      setIsConfigDialogOpen(true);
    } else {
      // Disable KB - show confirmation dialog
      setIsDisableDialogOpen(true);
    }
  };

  const onSubmit = async (data: KnowledgebaseConfigFormData) => {
    console.log('submitting form');
    setIsSaving(true);

    try {
      const response = await fetch(`/api/agent/${agent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isToolKnowledgebaseEnabled: true,
          isCustomMetadataFilteringEnabled:
            data.isCustomMetadataFilteringEnabled,
          toolKnowledgebaseSettings: data,
        }),
      });

      if (!response.ok) {
        toast.error('Failed to enable knowledge base', {
          description: 'An unexpected error occurred.',
        });
      }

      setIsConfigDialogOpen(false);
      toast.success('Knowledge base enabled', {
        description:
          'Knowledge base has been enabled and configured successfully.',
      });
      setIsToolKnowledgebaseEnabled(true);

      setAgent({
        id: agent.id,
        isToolKnowledgebaseEnabled: true,
        isCustomMetadataFilteringEnabled: data.isCustomMetadataFilteringEnabled,
        toolKnowledgebaseSettings: {
          maxResults: data.maxResults,
          minSimilarityScore: data.minSimilarityScore,
        },
      });
    } finally {
      setIsSaving(false);
    }
    router.refresh();
  };

  const handleDisable = async () => {
    setIsDisabling(true);
    try {
      const response = await fetch(`/api/agent/${agent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isToolKnowledgebaseEnabled: false }),
      });
      if (response.ok) {
        setIsDisableDialogOpen(false);
        toast.success('Knowledge base disabled', {
          description: 'Knowledge base has been disabled for this agent.',
        });
        setIsToolKnowledgebaseEnabled(false);
      } else {
        toast.error('Failed to disable knowledge base', {
          description: 'An unexpected error occurred.',
        });
      }
    } finally {
      setIsDisabling(false);
    }
    router.refresh();
  };

  const handleConfigCancel = () => {
    form.reset({
      isCustomMetadataFilteringEnabled: agent.isCustomMetadataFilteringEnabled,
      maxResults: agent.toolKnowledgebaseSettings.maxResults,
      minSimilarityScore: agent.toolKnowledgebaseSettings.minSimilarityScore,
    });
    setIsConfigDialogOpen(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Knowledge Base Settings
              </CardTitle>
              <CardDescription>
                Configure how the agent searches and uses your knowledge base
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Label className="text-sm font-medium">
                {isToolKnowledgebaseEnabled ? 'Enabled' : 'Disabled'}
              </Label>
              <Switch
                checked={isToolKnowledgebaseEnabled}
                onCheckedChange={handleSwitchChange}
                disabled={isSaving || isDisabling}
              />

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfigDialogOpen(true)}
                disabled={
                  isSaving || isDisabling || !isToolKnowledgebaseEnabled
                }
              >
                <Settings className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Knowledge Base Search</Label>
            <p className="text-sm text-muted-foreground">
              {isToolKnowledgebaseEnabled ? '🔍 Enabled' : '❌ Disabled'}
            </p>
          </div>

          {isToolKnowledgebaseEnabled && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label className="text-sm font-medium">
                  Custom Metadata Filtering
                </Label>
                <p className="text-sm text-muted-foreground">
                  {agent.isCustomMetadataFilteringEnabled
                    ? 'Enabled'
                    : 'Disabled'}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Max Results</Label>
                <p className="text-sm text-muted-foreground">
                  {agent.toolKnowledgebaseSettings.maxResults}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">
                  Similarity Threshold
                </Label>
                <p className="text-sm text-muted-foreground">
                  {agent.toolKnowledgebaseSettings.minSimilarityScore}
                </p>
              </div>
            </div>
          )}

          {!isToolKnowledgebaseEnabled && (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Knowledge base search is disabled</p>
              <p className="text-xs">Enable it to configure search settings</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accessible Documents Table - Only show when knowledgebase is enabled */}
      {isToolKnowledgebaseEnabled && (
        <AgentAccessibleDocuments
          agentId={agent.id}
          agent={{
            isCustomMetadataFilteringEnabled:
              agent.isCustomMetadataFilteringEnabled,
          }}
          refreshTrigger={refreshTrigger}
        />
      )}

      {/* Configuration Dialog (for enabling) */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Enable Knowledge Base</DialogTitle>
            <DialogDescription>
              Configure knowledge base settings for this agent
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 py-4"
            >
              <FormField
                control={form.control}
                name="isCustomMetadataFilteringEnabled"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Enable Custom Metadata Filtering</FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSaving || isDisabling}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Uses file-level metadata to apply access controls.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxResults"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Results</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="10"
                        {...field}
                        onChange={(e) =>
                          field.onChange(Number.parseInt(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum number of results to return (1-50)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minSimilarityScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Similarity Threshold: {field.value}</FormLabel>
                    <FormControl>
                      <div className="px-2">
                        <Slider
                          value={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                          max={1}
                          min={0}
                          step={0.1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>More Results</span>
                          <span>More Relevant</span>
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Higher values return more relevant but fewer results from
                      the knowledge base.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleConfigCancel}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Save Knowledge Base Settings
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Disable Confirmation Dialog */}
      <AlertDialog
        open={isDisableDialogOpen}
        onOpenChange={setIsDisableDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Knowledge Base?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disable knowledge base search for this agent. The agent
              will no longer be able to search and reference your knowledge base
              when responding to queries.
              <br />
              <br />
              You can re-enable it at any time, and your configuration settings
              will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisabling}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable}
              disabled={isDisabling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDisabling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Disabling...
                </>
              ) : (
                'Disable Knowledge Base'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
