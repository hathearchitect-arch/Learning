'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import { Code, ImageIcon, Database, Loader2, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

type Agent = {
  id: string;
  name: string;
  description: string;
  prompt: string;
  isActive: boolean;
  temperature: number;
  isToolKnowledgebaseEnabled: boolean;
  toolKnowledgebaseSettings: {
    maxResults: number;
    similarityThreshold: number;
  };
  isToolCodeGenerationEnabled: boolean;
  isToolImageGenerationEnabled: boolean;
  isToolQueryDatabaseEnabled: boolean;
  isToolCreateDocumentEnabled: boolean;
  isToolUpdateDocumentEnabled: boolean;
  createdAt: string;
  lastModified: string;
};

interface ToolsConfigurationProps {
  agent: Agent;
}

export function ToolsConfiguration({
  agent: initialAgent,
}: ToolsConfigurationProps) {
  const [agent, setAgent] = useState(initialAgent);
  const [codeGenDialog, setCodeGenDialog] = useState(false);
  const [imageGenDialog, setImageGenDialog] = useState(false);
  const [queryDbDialog, setQueryDbDialog] = useState(false);
  const [docGenDialog, setDocGenDialog] = useState(false);
  const [disableDialog, setDisableDialog] = useState<{
    open: boolean;
    tool:
      | 'codeGeneration'
      | 'imageGeneration'
      | 'queryDatabase'
      | 'createDocument'
      | null;
    title: string;
  }>({ open: false, tool: null, title: '' });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleAgentUpdate = (updatedAgent: Agent) => {
    setAgent(updatedAgent);
  };

  const updateTools = async (
    updates: Partial<
      Pick<
        Agent,
        | 'isToolCodeGenerationEnabled'
        | 'isToolImageGenerationEnabled'
        | 'isToolQueryDatabaseEnabled'
        | 'isToolCreateDocumentEnabled'
        | 'isToolUpdateDocumentEnabled'
      >
    >,
  ) => {
    try {
      const updatedAgent = {
        ...agent,
        ...updates,
      };

      const response = await fetch(`/api/agent/${agent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to save agent');
      }
      handleAgentUpdate(updatedAgent);
      router.refresh();
      return { success: true };
    } catch (error) {
      console.error('Error saving agent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  const handleToolToggle = (
    toolName:
      | 'codeGeneration'
      | 'imageGeneration'
      | 'queryDatabase'
      | 'createDocument',
    enabled: boolean,
    title: string,
  ) => {
    if (enabled) {
      // Enable tool - open configuration dialog
      switch (toolName) {
        case 'codeGeneration':
          setCodeGenDialog(true);
          break;
        case 'imageGeneration':
          setImageGenDialog(true);
          break;
        case 'queryDatabase':
          setQueryDbDialog(true);
          break;
        case 'createDocument':
          setDocGenDialog(true);
          break;
      }
    } else {
      // Disable tool - show confirmation
      setDisableDialog({ open: true, tool: toolName, title });
    }
  };

  const handleDisableTool = async () => {
    if (!disableDialog.tool) return;

    setIsLoading(true);
    try {
      let updates = {};
      switch (disableDialog.tool) {
        case 'codeGeneration':
          updates = { isToolCodeGenerationEnabled: false };
          break;
        case 'imageGeneration':
          updates = { isToolImageGenerationEnabled: false };
          break;
        case 'queryDatabase':
          updates = { isToolQueryDatabaseEnabled: false };
          break;
        case 'createDocument':
          updates = {
            isToolCreateDocumentEnabled: false,
            isToolUpdateDocumentEnabled: false,
          };
          break;
      }

      const result = await updateTools(updates);
      if (result.success) {
        setDisableDialog({ open: false, tool: null, title: '' });
        toast.success(`${disableDialog.title} disabled`, {
          description: 'Tool has been disabled for this agent.',
        });
      } else {
        toast.error(`Failed to disable ${disableDialog.title}`, {
          description: result.error || 'An unexpected error occurred.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableCodeGeneration = async () => {
    setIsLoading(true);
    try {
      const result = await updateTools({
        isToolCodeGenerationEnabled: true,
      });
      if (result.success) {
        setCodeGenDialog(false);
        toast.success('Code generation enabled', {
          description: 'Agent can now generate and execute code.',
        });
      } else {
        toast.error('Failed to enable code generation', {
          description: result.error || 'An unexpected error occurred.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableImageGeneration = async () => {
    setIsLoading(true);
    try {
      const result = await updateTools({
        isToolImageGenerationEnabled: true,
      });
      if (result.success) {
        setImageGenDialog(false);
        toast.success('Image generation enabled', {
          description: 'Agent can now generate images from text descriptions.',
        });
      } else {
        toast.error('Failed to enable image generation', {
          description: result.error || 'An unexpected error occurred.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableQueryDatabase = async () => {
    setIsLoading(true);
    try {
      const result = await updateTools({
        isToolQueryDatabaseEnabled: true,
      });
      if (result.success) {
        setQueryDbDialog(false);
        toast.success('Database querying enabled', {
          description: 'Agent can now query connected databases.',
        });
      } else {
        toast.error('Failed to enable database querying', {
          description: result.error || 'An unexpected error occurred.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableCreateDocument = async () => {
    setIsLoading(true);
    try {
      const result = await updateTools({
        isToolCreateDocumentEnabled: true,
        isToolUpdateDocumentEnabled: true,
      });
      if (result.success) {
        setDocGenDialog(false);
        toast.success('Document creation enabled', {
          description: 'Agent can now create documents.',
        });
      } else {
        toast.error('Failed to enable document creation', {
          description: result.error || 'An unexpected error occurred.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {/* Code Generation Tool
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                <CardTitle className="text-base">Code Generation</CardTitle>
              </div>
              <Switch
                checked={agent.isToolCodeGenerationEnabled}
                onCheckedChange={(checked) =>
                  handleToolToggle('codeGeneration', checked, 'Code Generation')
                }
                disabled={isLoading}
              />
            </div>
            <CardDescription>
              Generate and execute code in multiple languages
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {agent.isToolCodeGenerationEnabled ? (
              <div className="space-y-2">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">
                    SUPPORTED LANGUAGES
                  </Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {['javascript', 'python', 'typescript', 'sql'].map(
                      (lang) => (
                        <span
                          key={lang}
                          className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-md capitalize"
                        >
                          {lang}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Code className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Code generation is disabled</p>
              </div>
            )}
          </CardContent>
        </Card>
        */}

        {/* Image Generation Tool 
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                <CardTitle className="text-base">Image Generation</CardTitle>
              </div>
              <Switch
                checked={agent.isToolImageGenerationEnabled}
                onCheckedChange={(checked) =>
                  handleToolToggle(
                    'imageGeneration',
                    checked,
                    'Image Generation',
                  )
                }
                disabled={isLoading}
              />
            </div>
            <CardDescription>
              Create images from text descriptions
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {agent.isToolImageGenerationEnabled ? (
              <div className="space-y-2">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">
                    MODEL
                  </Label>
                  <p className="text-sm font-medium">DALL-E 3</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">
                    MAX IMAGES
                  </Label>
                  <p className="text-sm font-medium">5 per request</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Image generation is disabled</p>
              </div>
            )}
          </CardContent>
        </Card>
        */}

        {/* Query Database Tool 
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                <CardTitle className="text-base">Query Database</CardTitle>
              </div>
              <Switch
                checked={agent.isToolQueryDatabaseEnabled}
                onCheckedChange={(checked) =>
                  handleToolToggle('queryDatabase', checked, 'Query Database')
                }
                disabled={isLoading}
              />
            </div>
            <CardDescription>
              Execute SQL queries on connected databases
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {agent.isToolQueryDatabaseEnabled ? (
              <div className="space-y-2">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">
                    DATABASES
                  </Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {['main', 'analytics'].map((db) => (
                      <span
                        key={db}
                        className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-md"
                      >
                        {db}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">
                    MAX QUERIES
                  </Label>
                  <p className="text-sm font-medium">10 per conversation</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Database querying is disabled</p>
              </div>
            )}
          </CardContent>
        </Card>
        */}

        {/* Document Creation Tool */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StickyNote className="h-5 w-5" />
                <CardTitle className="text-base">Document Creation</CardTitle>
              </div>
              <Switch
                checked={agent.isToolCreateDocumentEnabled}
                onCheckedChange={(checked) =>
                  handleToolToggle('createDocument', checked, 'Create Document')
                }
                disabled={isLoading}
              />
            </div>
            <CardDescription>
              Generate document within chat response
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {agent.isToolCreateDocumentEnabled ? (
              <div className="text-center py-4 text-muted-foreground">
                <StickyNote className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Document creation is enabled</p>
                <p className="text-xs">
                  Automatically update/refine document is
                  {agent.isToolUpdateDocumentEnabled ? ' enabled' : ' disabled'}
                </p>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <StickyNote className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Document creation is disabled</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Code Generation Enable Dialog */}
      <Dialog open={codeGenDialog} onOpenChange={setCodeGenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Code Generation</DialogTitle>
            <DialogDescription>
              Allow this agent to generate and execute code in multiple
              programming languages.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">
                  Supported Languages
                </Label>
                <p className="text-sm text-muted-foreground">
                  JavaScript, Python, TypeScript, SQL
                </p>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Security Note:</strong> Code execution runs in a
                  sandboxed environment with limited access to system resources.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCodeGenDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleEnableCodeGeneration} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enable Code Generation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Generation Enable Dialog */}
      <Dialog open={imageGenDialog} onOpenChange={setImageGenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Image Generation</DialogTitle>
            <DialogDescription>
              Allow this agent to create images from text descriptions.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Model</Label>
                <p className="text-sm text-muted-foreground">
                  DALL-E 3 (High quality image generation)
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Limits</Label>
                <p className="text-sm text-muted-foreground">
                  Up to 5 images per request
                </p>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Usage Note:</strong> Image generation may incur
                  additional costs based on your plan.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImageGenDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleEnableImageGeneration} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enable Image Generation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Query Database Enable Dialog */}
      <Dialog open={queryDbDialog} onOpenChange={setQueryDbDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Database Querying</DialogTitle>
            <DialogDescription>
              Allow this agent to execute SQL queries on your connected
              databases.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">
                  Available Databases
                </Label>
                <p className="text-sm text-muted-foreground">Main, Analytics</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Query Limits</Label>
                <p className="text-sm text-muted-foreground">
                  Up to 10 queries per conversation
                </p>
              </div>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Security Warning:</strong> Agent will have read-only
                  access to specified databases. Review your database
                  permissions carefully.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQueryDbDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleEnableQueryDatabase} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enable Database Querying
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Generation Enable Dialog */}
      <Dialog open={docGenDialog} onOpenChange={setDocGenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Document Creation</DialogTitle>
            <DialogDescription>
              Allow this agent to create documents in the chat interface.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">
                  Automatically Update/Refine Documents
                </Label>
                <p className="text-sm text-muted-foreground">
                  After creating a document, the agent will attempt to update
                  and refine it, improving the document.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDocGenDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleEnableCreateDocument} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enable Document Creation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Tool Confirmation Dialog */}
      <AlertDialog
        open={disableDialog.open}
        onOpenChange={(open) => setDisableDialog({ ...disableDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable {disableDialog.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disable {disableDialog.title.toLowerCase()} for this
              agent. The agent will no longer be able to use this tool in
              conversations.
              <br />
              <br />
              You can re-enable it at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisableTool}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Disabling...
                </>
              ) : (
                `Disable ${disableDialog.title}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
