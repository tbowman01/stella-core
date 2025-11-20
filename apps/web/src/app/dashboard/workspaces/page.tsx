'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tantml:react-query';
import { workspacesApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Folder, Plus, ChevronRight, FileText, Trash2 } from 'lucide-react';
import { formatDate, getClassificationColor } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

export default function WorkspacesPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({ name: '', description: '' });
  const queryClient = useQueryClient();

  const { data: workspaces, isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspacesApi.list,
  });

  const { data: hierarchy } = useQuery({
    queryKey: ['workspaces', 'hierarchy'],
    queryFn: workspacesApi.getHierarchy,
  });

  const createMutation = useMutation({
    mutationFn: (params: { name: string; description?: string }) =>
      workspacesApi.create(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setIsCreating(false);
      setNewWorkspace({ name: '', description: '' });
      toast.success('Workspace created successfully');
    },
    onError: () => {
      toast.error('Failed to create workspace');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workspacesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace deleted');
    },
    onError: () => {
      toast.error('Failed to delete workspace');
    },
  });

  const handleCreate = () => {
    if (!newWorkspace.name.trim()) {
      toast.error('Workspace name is required');
      return;
    }
    createMutation.mutate(newWorkspace);
  };

  const renderWorkspaceTree = (nodes: any[], level = 0) => {
    return nodes.map((node) => (
      <div key={node.id} style={{ marginLeft: `${level * 24}px` }}>
        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 group">
          <div className="flex items-center gap-3 flex-1">
            <Folder className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <Link
                href={`/dashboard/workspaces/${node.id}`}
                className="font-medium hover:text-primary"
              >
                {node.name}
              </Link>
              {node.description && (
                <p className="text-xs text-muted-foreground">{node.description}</p>
              )}
            </div>
            {node.classification && (
              <Badge className={getClassificationColor(node.classification)}>
                {node.classification}
              </Badge>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{node.documentCount || 0}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100"
            onClick={() => deleteMutation.mutate(node.id)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
        {node.children && node.children.length > 0 && renderWorkspaceTree(node.children, level + 1)}
      </div>
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
          <p className="text-muted-foreground">Organize your documents into workspaces</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Workspace
        </Button>
      </div>

      {/* Create Workspace Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Workspace</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Workspace Name</Label>
                <Input
                  id="name"
                  value={newWorkspace.name}
                  onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
                  placeholder="e.g., Legal Documents, Engineering Projects"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={newWorkspace.description}
                  onChange={(e) =>
                    setNewWorkspace({ ...newWorkspace, description: e.target.value })
                  }
                  placeholder="Brief description of this workspace"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Workspace'}
                </Button>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workspaces List */}
      <Card>
        <CardHeader>
          <CardTitle>All Workspaces ({workspaces?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading workspaces...</p>
            </div>
          ) : hierarchy && hierarchy.length > 0 ? (
            <div className="space-y-1">{renderWorkspaceTree(hierarchy)}</div>
          ) : (
            <div className="text-center py-12">
              <Folder className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-semibold">No workspaces yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first workspace to organize documents
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workspace Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {[
              { id: 'legal-matter', name: 'Legal Matter', icon: '⚖️' },
              { id: 'software-project', name: 'Software Project', icon: '💻' },
              { id: 'financial-audit', name: 'Financial Audit', icon: '📊' },
              { id: 'employee-file', name: 'Employee File', icon: '👤' },
            ].map((template) => (
              <button
                key={template.id}
                className="p-4 rounded-lg border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-colors text-center"
              >
                <div className="text-4xl mb-2">{template.icon}</div>
                <p className="font-medium">{template.name}</p>
                <p className="text-xs text-muted-foreground mt-1">Use template</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
