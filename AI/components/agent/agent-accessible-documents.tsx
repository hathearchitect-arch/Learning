'use client';

import { useState, useEffect } from 'react';
import { DataTable } from '@/components/datatable/data-table';
import {
  agentDocumentColumns,
  type AgentDocumentSchema,
  documentTypes,
} from '@/components/agent/agent-document-data-table-columns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Files, Loader2, FolderOpen, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { DocumentLibrarySelector } from '@/components/agent/agent-knowledgebase-document-selector';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AgentAccessibleDocumentsProps {
  agentId: string;
  agent: {
    isCustomMetadataFilteringEnabled: boolean;
  };
  refreshTrigger?: number; // Optional prop to trigger refresh
}

export function AgentAccessibleDocuments({
  agentId,
  agent,
  refreshTrigger,
}: AgentAccessibleDocumentsProps) {
  const [documents, setDocuments] = useState<AgentDocumentSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFolderSelectorOpen, setIsFolderSelectorOpen] = useState(false);
  const [assignedFolders, setAssignedFolders] = useState<any[]>([]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/agent/${agentId}/files`);

      if (!response.ok) {
        throw new Error('Failed to fetch accessible documents');
      }
      const data = await response.json();
      setDocuments(data.data || []);
    } catch (error) {
      console.error('Error fetching accessible documents:', error);
      toast.error('Failed to load accessible documents');
    } finally {
      setLoading(false);
    }
  };

  // Fetch assigned folders
  const fetchAssignedFolders = async () => {
    try {
      const response = await fetch(`/api/agent/${agentId}/folder`);
      if (response.ok) {
        const data = await response.json();
        setAssignedFolders(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching assigned folders:', error);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchAssignedFolders();
  }, [agentId, refreshTrigger]);

  // Handle folder selector close and refresh
  const handleFolderSelectorClose = (open: boolean) => {
    setIsFolderSelectorOpen(open);
    if (!open) {
      fetchAssignedFolders();
      fetchDocuments(); // Refresh documents when folders change
    }
  };

  // Create filter options based on document types and folders
  const folderFilters = Array.from(
    new Set(documents.map((doc) => doc.folderName)),
  ).map((folderName) => ({
    label: folderName,
    value: folderName,
  }));

  const typeFilters = documentTypes.map((type) => ({
    label: type.label,
    value: type.value,
  }));

  const indexedFilters = [
    { label: 'Indexed', value: 'true' },
    { label: 'Indexing', value: 'false' },
  ];

  const filters = [
    {
      column: 'folderName',
      title: 'Folder',
      options: folderFilters,
    },
    {
      column: 'type',
      title: 'Type',
      options: typeFilters,
    },
    {
      column: 'isVectorized',
      title: 'Status',
      options: indexedFilters,
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Files className="h-5 w-5" />
                Accessible Documents
              </CardTitle>
              <CardDescription>
                Documents this agent can access based on assigned folder
                permissions
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={agent.isCustomMetadataFilteringEnabled}
              onClick={() => setIsFolderSelectorOpen(true)}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Manage Folders
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Folder Access Section - Hidden when custom metadata filtering is enabled */}
          {!agent.isCustomMetadataFilteringEnabled && (
            <div className="border-b pb-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <Label className="text-sm font-medium">Folder Access</Label>
                  <p className="text-xs text-muted-foreground">
                    Control which document folders this agent can access.
                  </p>
                </div>
              </div>

              {/* Show assigned folders */}
              {assignedFolders.length > 0 ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Currently assigned folders ({assignedFolders.length}):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {assignedFolders.map((folderAssignment) => (
                      <Badge
                        key={folderAssignment.id}
                        variant="secondary"
                        className="text-xs max-w-[200px]"
                      >
                        <span
                          className="truncate"
                          title={folderAssignment.folder.path}
                        >
                          {folderAssignment.folder.path}
                        </span>
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">
                    No folders assigned. This agent has no access to
                    knowledgebase documents.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Documents Section - Hidden when custom metadata filtering is enabled */}
          {!agent.isCustomMetadataFilteringEnabled &&
            (loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading accessible documents...</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Files className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No documents accessible</p>
                <p className="text-xs">
                  Assign folders to the agent to see accessible documents
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {documents.length} accessible document
                    {documents.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <DataTable
                  columns={agentDocumentColumns}
                  data={documents}
                  filters={filters}
                  searchColumnName="name"
                />
              </div>
            ))}

          {/* Custom Metadata Filtering Override Message */}
          {agent.isCustomMetadataFilteringEnabled && (
            <Alert className="bg-secondary">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Custom Metadata Filtering Enabled</AlertTitle>
              <AlertDescription>
                This agent uses custom metadata filtering to control document
                access. Folder-based permissions are overridden by file-level
                metadata rules.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Folder Selector Dialog */}
      <DocumentLibrarySelector
        open={isFolderSelectorOpen}
        onOpenChange={handleFolderSelectorClose}
        agentId={agentId}
      />
    </>
  );
}
