'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Folder, FolderOpen, FolderPlus, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type DocumentFolder = {
  id: string;
  name: string;
  path: string;
  documentCount?: number;
  size?: string;
  lastModified?: string;
  children?: DocumentFolder[];
};

interface DocumentLibrarySelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
}

export function DocumentLibrarySelector({
  open,
  onOpenChange,
  agentId,
}: DocumentLibrarySelectorProps) {
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [tempSelectedFolders, setTempSelectedFolders] = useState<string[]>([]);

  // Fetch folders and current agent folder assignments
  const fetchData = async () => {
    if (!open) return;

    setLoading(true);
    try {
      // Fetch all folders in tree structure
      const foldersResponse = await fetch('/api/folder?tree=true');
      if (!foldersResponse.ok) {
        throw new Error('Failed to fetch folders');
      }
      const foldersData = await foldersResponse.json();

      // Fetch agent's assigned folders
      const agentFoldersResponse = await fetch(`/api/agent/${agentId}/folder`);
      if (!agentFoldersResponse.ok) {
        throw new Error('Failed to fetch agent folders');
      }
      const agentFoldersData = await agentFoldersResponse.json();

      // Transform folders data to the expected format
      const transformedFolders = transformFoldersData(foldersData.data);
      setFolders(transformedFolders);

      // Set selected folders
      const assignedFolderIds =
        agentFoldersData.data?.map((af: any) => af.folderId) || [];
      setSelectedFolders(assignedFolderIds);
      setTempSelectedFolders(assignedFolderIds);

      // Auto-expand folders that contain selected items
      if (assignedFolderIds.length > 0) {
        const allFolders = flattenFolders(transformedFolders);
        const foldersToExpand = new Set<string>();

        // Find parent folders of selected folders
        assignedFolderIds.forEach((selectedId: string) => {
          const selectedFolder = allFolders.find((f) => f.id === selectedId);
          if (selectedFolder) {
            // Find all parent folders by checking paths
            allFolders.forEach((folder) => {
              if (
                selectedFolder.path.startsWith(folder.path) &&
                folder.id !== selectedId
              ) {
                foldersToExpand.add(folder.id);
              }
            });
          }
        });

        setExpandedFolders(foldersToExpand);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  // Transform the folder data from the API to match our component structure
  const transformFoldersData = (folderData: any): DocumentFolder[] => {
    if (!folderData || !folderData.childFolders) {
      return [];
    }

    const transformFolder = (folder: any, parentPath = ''): DocumentFolder => {
      const folderPath = parentPath
        ? `${parentPath}/${folder.name}`
        : `/${folder.name}`;
      return {
        id: folder.id,
        name: folder.name,
        path: folderPath,
        documentCount: folder.files?.length || 0,
        size: calculateFolderSize(folder.files || []),
        lastModified: folder.createdAt,
        children:
          folder.childFolders?.map((child: any) =>
            transformFolder(child, folderPath),
          ) || [],
      };
    };

    return folderData.childFolders.map((folder: any) =>
      transformFolder(folder),
    );
  };

  // Calculate folder size from files
  const calculateFolderSize = (files: any[]): string => {
    const totalBytes = files.reduce((sum, file) => sum + (file.size || 0), 0);
    if (totalBytes === 0) return '0 MB';
    const mb = totalBytes / (1024 * 1024);
    return mb < 0.1 ? '< 0.1 MB' : `${mb.toFixed(1)} MB`;
  };

  // Flatten folder tree to get all folder IDs for easy searching
  const flattenFolders = (folders: DocumentFolder[]): DocumentFolder[] => {
    const result: DocumentFolder[] = [];

    const traverse = (folderList: DocumentFolder[]) => {
      for (const folder of folderList) {
        result.push(folder);
        if (folder.children && folder.children.length > 0) {
          traverse(folder.children);
        }
      }
    };

    traverse(folders);
    return result;
  };

  useEffect(() => {
    fetchData();
  }, [open, agentId]);

  useEffect(() => {
    setTempSelectedFolders(selectedFolders);
  }, [selectedFolders, open]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const expandAllFolders = () => {
    const allFolders = flattenFolders(folders);
    const foldersWithChildren = allFolders.filter(
      (f) => f.children && f.children.length > 0,
    );
    setExpandedFolders(new Set(foldersWithChildren.map((f) => f.id)));
  };

  const collapseAllFolders = () => {
    setExpandedFolders(new Set());
  };

  // Get all descendant folder IDs for a given folder
  const getAllDescendantFolderIds = (folderId: string): string[] => {
    const allFolders = flattenFolders(folders);
    const targetFolder = allFolders.find((f) => f.id === folderId);
    if (!targetFolder || !targetFolder.children) return [];

    const descendantIds: string[] = [];

    const traverse = (children: DocumentFolder[]) => {
      for (const child of children) {
        descendantIds.push(child.id);
        if (child.children && child.children.length > 0) {
          traverse(child.children);
        }
      }
    };

    traverse(targetFolder.children);
    return descendantIds;
  };

  const toggleFolderSelection = (folderId: string) => {
    setTempSelectedFolders((prev) => {
      const isCurrentlySelected = prev.includes(folderId);

      if (isCurrentlySelected) {
        // When deselecting a folder, also deselect all its descendants
        const descendantIds = getAllDescendantFolderIds(folderId);
        const idsToRemove = [folderId, ...descendantIds];
        return prev.filter((id) => !idsToRemove.includes(id));
      } else {
        // When selecting a folder, also select all its descendants
        const descendantIds = getAllDescendantFolderIds(folderId);
        const idsToAdd = [folderId, ...descendantIds];
        const newSelection = [...prev];

        // Add new IDs that aren't already selected
        idsToAdd.forEach((id) => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });

        return newSelection;
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/agent/${agentId}/folder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderIds: tempSelectedFolders,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update agent folders');
      }

      setSelectedFolders(tempSelectedFolders);
      onOpenChange(false);
      toast.success('Agent folder access updated successfully');
    } catch (error) {
      console.error('Error saving folders:', error);
      toast.error('Failed to update folder access');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setTempSelectedFolders(selectedFolders);
    onOpenChange(false);
  };

  // Recursive function to check if folder or any of its children match search
  const searchMatchesFolder = (
    folder: DocumentFolder,
    searchTerm: string,
  ): boolean => {
    if (searchTerm === '') return true;

    // Check if current folder matches
    if (folder.name.toLowerCase().includes(searchTerm)) {
      return true;
    }

    // Check if any child folder matches
    if (folder.children && folder.children.length > 0) {
      return folder.children.some((child) =>
        searchMatchesFolder(child, searchTerm),
      );
    }

    return false;
  };

  const filteredFolders = folders.filter((folder) =>
    searchMatchesFolder(folder, searchTerm.toLowerCase()),
  );

  // Check if a folder is in indeterminate state (some but not all children selected)
  const getFolderSelectionState = (folder: DocumentFolder) => {
    const isSelected = tempSelectedFolders.includes(folder.id);

    if (!folder.children || folder.children.length === 0) {
      return { isSelected, isIndeterminate: false };
    }

    const descendantIds = getAllDescendantFolderIds(folder.id);
    const selectedDescendants = descendantIds.filter((id) =>
      tempSelectedFolders.includes(id),
    );

    if (isSelected) {
      // If this folder is selected, check if all descendants are also selected
      const allDescendantsSelected =
        descendantIds.length === selectedDescendants.length;
      return { isSelected: true, isIndeterminate: !allDescendantsSelected };
    } else {
      // If this folder is not selected, check if any descendants are selected
      const hasSelectedDescendants = selectedDescendants.length > 0;
      return { isSelected: false, isIndeterminate: hasSelectedDescendants };
    }
  };

  const renderFolder = (folder: DocumentFolder, level = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const { isSelected, isIndeterminate } = getFolderSelectionState(folder);
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder.id} className="space-y-1">
        <div
          className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50 transition-colors ${
            level > 0 ? `ml-${Math.min(level * 6, 24)}` : ''
          } ${isSelected ? 'bg-accent/50' : ''}`}
        >
          <div className="flex items-center space-x-2 flex-1">
            {/* Indentation indicators for nested levels */}
            {level > 0 && (
              <div className="flex items-center">
                {Array.from({ length: level }).map((_, i) => (
                  <div
                    key={`indent-${folder.id}-${level}-${i}`}
                    className="w-4 h-4 flex items-center justify-center"
                  >
                    {i === level - 1 ? (
                      <div className="w-2 h-px bg-border" />
                    ) : (
                      <div className="w-px h-4 bg-border" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-muted"
                onClick={() => toggleFolder(folder.id)}
              >
                {isExpanded ? (
                  <FolderOpen className="h-4 w-4 text-primary" />
                ) : (
                  <FolderPlus className="h-4 w-4" />
                )}
              </Button>
            ) : (
              <div className="h-6 w-6 flex items-center justify-center">
                <Folder className="h-4 w-4 text-muted-foreground" />
              </div>
            )}

            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleFolderSelection(folder.id)}
              className={`data-[state=checked]:bg-primary data-[state=checked]:border-primary ${
                isIndeterminate && !isSelected
                  ? 'bg-primary/30 border-primary'
                  : ''
              }`}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 min-w-0">
                  <span
                    className={`font-medium truncate ${
                      isSelected
                        ? 'text-primary'
                        : isIndeterminate
                          ? 'text-primary/70'
                          : ''
                    }`}
                  >
                    {folder.name}
                  </span>
                  {level > 0 && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      Nested
                    </span>
                  )}
                  {isIndeterminate && !isSelected && (
                    <span className="text-xs text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">
                      Partial
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {folder.documentCount || 0} docs
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {folder.size || '0 MB'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {folder.path}
              </p>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {folder.children?.map((child) => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Document Folders</DialogTitle>
          <DialogDescription>
            Choose which folders from your document library the agent should use
            for knowledge base search.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and expand/collapse controls */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search folders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={expandAllFolders}
              className="whitespace-nowrap"
            >
              Expand All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={collapseAllFolders}
              className="whitespace-nowrap"
            >
              Collapse All
            </Button>
          </div>

          {/* Selected folders summary */}
          {tempSelectedFolders.length > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">
                Selected folders ({tempSelectedFolders.length}):
              </p>
              <div className="flex flex-wrap gap-1">
                {tempSelectedFolders.map((id) => {
                  const allFolders = flattenFolders(folders);
                  const folder = allFolders.find((f) => f.id === id);
                  return (
                    folder && (
                      <Badge
                        key={id}
                        variant="default"
                        className="text-xs max-w-[200px]"
                      >
                        <span className="truncate" title={folder.path}>
                          {folder.path}
                        </span>
                      </Badge>
                    )
                  );
                })}
              </div>
            </div>
          )}

          <Separator />

          {/* Search results info */}
          {searchTerm && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Searching for &ldquo;{searchTerm}&rdquo; -{' '}
                {filteredFolders.length} folder
                {filteredFolders.length !== 1 ? 's' : ''} found
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm('')}
                className="h-auto p-1 text-xs"
              >
                Clear search
              </Button>
            </div>
          )}

          {/* Folder tree */}
          <ScrollArea className="h-[400px] w-full">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading document library...</span>
              </div>
            ) : filteredFolders.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <div className="text-center">
                  <p className="text-sm">No folders found</p>
                  <p className="text-xs">
                    Create folders in your document library to assign them to
                    agents
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredFolders.map((folder) => renderFolder(folder))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Selection ({tempSelectedFolders.length} folders)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
