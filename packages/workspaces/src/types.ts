/**
 * Workspace types
 */

import { DocumentClassification } from '@arcqubit/shared';

export interface Workspace {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  parentId?: string;
  classification: DocumentClassification;
  metadata: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceWithChildren extends Workspace {
  children: WorkspaceWithChildren[];
  documentCount?: number;
}

export interface WorkspacePermission {
  workspaceId: string;
  userId?: string;
  roleId?: string;
  permission: 'read' | 'write' | 'admin';
}

export interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  type: 'legal' | 'engineering' | 'finance' | 'hr' | 'custom';
  structure: {
    name: string;
    classification?: DocumentClassification;
    children?: WorkspaceTemplate['structure'][];
  }[];
  metadata: Record<string, unknown>;
}
