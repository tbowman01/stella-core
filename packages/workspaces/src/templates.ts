/**
 * Workspace templates for common use cases
 */

import { DocumentClassification } from '@arcqubit/shared';
import { WorkspaceTemplate } from './types';
import { createWorkspace } from './workspaces';

/**
 * Predefined workspace templates
 */
export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  {
    id: 'legal-matter',
    name: 'Legal Matter',
    description: 'Workspace structure for legal matters',
    type: 'legal',
    structure: [
      {
        name: 'Pleadings',
        classification: 'confidential',
      },
      {
        name: 'Discovery',
        classification: 'confidential',
        children: [
          { name: 'Requests', classification: 'confidential' },
          { name: 'Responses', classification: 'confidential' },
          { name: 'Documents', classification: 'confidential' },
        ],
      },
      {
        name: 'Correspondence',
        classification: 'internal',
      },
      {
        name: 'Research',
        classification: 'internal',
      },
      {
        name: 'Final Documents',
        classification: 'confidential',
      },
    ],
    metadata: {
      industry: 'legal',
      useCase: 'litigation',
    },
  },
  {
    id: 'software-project',
    name: 'Software Project',
    description: 'Workspace structure for software development projects',
    type: 'engineering',
    structure: [
      {
        name: 'Requirements',
        classification: 'internal',
      },
      {
        name: 'Design',
        classification: 'internal',
        children: [
          { name: 'Architecture', classification: 'internal' },
          { name: 'UI/UX', classification: 'internal' },
          { name: 'Database', classification: 'internal' },
        ],
      },
      {
        name: 'Documentation',
        classification: 'internal',
      },
      {
        name: 'Testing',
        classification: 'internal',
      },
      {
        name: 'Deployment',
        classification: 'confidential',
      },
    ],
    metadata: {
      industry: 'technology',
      useCase: 'software-development',
    },
  },
  {
    id: 'financial-audit',
    name: 'Financial Audit',
    description: 'Workspace structure for financial audits',
    type: 'finance',
    structure: [
      {
        name: 'Planning',
        classification: 'confidential',
      },
      {
        name: 'Financial Statements',
        classification: 'confidential',
      },
      {
        name: 'Supporting Documents',
        classification: 'confidential',
        children: [
          { name: 'Invoices', classification: 'confidential' },
          { name: 'Receipts', classification: 'confidential' },
          { name: 'Contracts', classification: 'confidential' },
        ],
      },
      {
        name: 'Audit Reports',
        classification: 'restricted',
      },
      {
        name: 'Correspondence',
        classification: 'confidential',
      },
    ],
    metadata: {
      industry: 'finance',
      useCase: 'audit',
    },
  },
  {
    id: 'hr-employee',
    name: 'Employee File',
    description: 'Workspace structure for employee records',
    type: 'hr',
    structure: [
      {
        name: 'Personal Information',
        classification: 'restricted',
      },
      {
        name: 'Employment Documents',
        classification: 'confidential',
      },
      {
        name: 'Performance Reviews',
        classification: 'confidential',
      },
      {
        name: 'Benefits',
        classification: 'confidential',
      },
      {
        name: 'Training',
        classification: 'internal',
      },
    ],
    metadata: {
      industry: 'hr',
      useCase: 'employee-management',
    },
  },
];

/**
 * Get template by ID
 */
export function getTemplate(templateId: string): WorkspaceTemplate | undefined {
  return WORKSPACE_TEMPLATES.find((t) => t.id === templateId);
}

/**
 * Get templates by type
 */
export function getTemplatesByType(type: WorkspaceTemplate['type']): WorkspaceTemplate[] {
  return WORKSPACE_TEMPLATES.filter((t) => t.type === type);
}

/**
 * Create workspace from template
 */
export async function createWorkspaceFromTemplate(
  templateId: string,
  tenantId: string,
  userId: string,
  options: {
    name: string;
    description?: string;
    parentId?: string;
  }
): Promise<{ workspaceId: string; childWorkspaceIds: string[] }> {
  const template = getTemplate(templateId);

  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }

  // Create root workspace
  const root = await createWorkspace({
    tenantId,
    name: options.name,
    description: options.description || template.description,
    parentId: options.parentId,
    classification: 'internal',
    metadata: {
      ...template.metadata,
      createdFromTemplate: templateId,
    },
    createdBy: userId,
  });

  const childWorkspaceIds: string[] = [];

  // Create child workspaces from template structure
  async function createChildren(
    structures: WorkspaceTemplate['structure'],
    parentId: string
  ): Promise<void> {
    for (const structure of structures) {
      const child = await createWorkspace({
        tenantId,
        name: structure.name,
        parentId,
        classification: structure.classification || 'internal',
        createdBy: userId,
      });

      childWorkspaceIds.push(child.id);

      // Recursively create children
      if (structure.children && structure.children.length > 0) {
        await createChildren(structure.children, child.id);
      }
    }
  }

  await createChildren(template.structure, root.id);

  return {
    workspaceId: root.id,
    childWorkspaceIds,
  };
}

/**
 * Get available templates for user
 */
export async function getAvailableTemplates(
  userId: string,
  tenantId: string
): Promise<WorkspaceTemplate[]> {
  // For MVP, all templates are available to all users
  // In production, filter by tenant settings or user permissions
  return WORKSPACE_TEMPLATES;
}
