import { pluginManager } from './manager';
import type {
  DocumentUploadEvent,
  DocumentClassifyEvent,
  SearchQueryEvent,
  SearchResultsEvent,
  AIQueryEvent,
  AIResponseEvent,
  ComplianceCheckEvent,
  AuditEventPayload,
} from './types';

/**
 * Hook utilities for triggering plugin events
 */

export async function triggerDocumentUploadHook(
  event: DocumentUploadEvent,
  tenantId: string,
  userId: string
): Promise<void> {
  await pluginManager.executeHook('onDocumentUpload', event, tenantId, userId);
}

export async function triggerDocumentUpdateHook(
  event: DocumentUploadEvent,
  tenantId: string,
  userId: string
): Promise<void> {
  await pluginManager.executeHook('onDocumentUpdate', event, tenantId, userId);
}

export async function triggerDocumentDeleteHook(
  event: { documentId: string },
  tenantId: string,
  userId: string
): Promise<void> {
  await pluginManager.executeHook('onDocumentDelete', event, tenantId, userId);
}

export async function triggerDocumentClassifyHook(
  event: DocumentClassifyEvent,
  tenantId: string,
  userId: string
): Promise<DocumentClassifyEvent> {
  const results = await pluginManager.executeHook('onDocumentClassify', event, tenantId, userId);

  // Plugins can modify the classification suggestion
  // Return the modified event or original if no changes
  return event;
}

export async function triggerSearchQueryHook(
  event: SearchQueryEvent,
  tenantId: string,
  userId: string
): Promise<SearchQueryEvent> {
  await pluginManager.executeHook('onSearchQuery', event, tenantId, userId);
  return event;
}

export async function triggerSearchResultsHook(
  event: SearchResultsEvent,
  tenantId: string,
  userId: string
): Promise<SearchResultsEvent> {
  await pluginManager.executeHook('onSearchResults', event, tenantId, userId);
  return event;
}

export async function triggerAIQueryHook(
  event: AIQueryEvent,
  tenantId: string,
  userId: string
): Promise<AIQueryEvent> {
  await pluginManager.executeHook('onAIQuery', event, tenantId, userId);
  return event;
}

export async function triggerAIResponseHook(
  event: AIResponseEvent,
  tenantId: string,
  userId: string
): Promise<AIResponseEvent> {
  await pluginManager.executeHook('onAIResponse', event, tenantId, userId);
  return event;
}

export async function triggerComplianceCheckHook(
  event: ComplianceCheckEvent,
  tenantId: string,
  userId: string
): Promise<void> {
  await pluginManager.executeHook('onComplianceCheck', event, tenantId, userId);
}

export async function triggerAuditEventHook(
  event: AuditEventPayload,
  tenantId: string,
  userId: string
): Promise<void> {
  await pluginManager.executeHook('onAuditEvent', event, tenantId, userId);
}

export async function triggerUserLoginHook(
  event: { userId: string },
  tenantId: string,
  userId: string
): Promise<void> {
  await pluginManager.executeHook('onUserLogin', event, tenantId, userId);
}

export async function triggerUserLogoutHook(
  event: { userId: string },
  tenantId: string,
  userId: string
): Promise<void> {
  await pluginManager.executeHook('onUserLogout', event, tenantId, userId);
}

export async function triggerWorkspaceCreateHook(
  event: { workspaceId: string; name: string },
  tenantId: string,
  userId: string
): Promise<void> {
  await pluginManager.executeHook('onWorkspaceCreate', event, tenantId, userId);
}

export async function triggerWorkspaceUpdateHook(
  event: { workspaceId: string; name: string },
  tenantId: string,
  userId: string
): Promise<void> {
  await pluginManager.executeHook('onWorkspaceUpdate', event, tenantId, userId);
}
