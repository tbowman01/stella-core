/**
 * Conversation management
 */

import { Conversation, ConversationMessage } from './types';
import { randomString } from '@arcqubit/shared';

// In-memory conversation store (for MVP)
// In production, store in database
const conversations = new Map<string, Conversation>();

/**
 * Create new conversation
 */
export async function createConversation(
  tenantId: string,
  userId: string,
  title?: string
): Promise<Conversation> {
  const conversation: Conversation = {
    id: randomString(32),
    tenantId,
    userId,
    title: title || 'New Conversation',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  conversations.set(conversation.id, conversation);

  return conversation;
}

/**
 * Get conversation by ID
 */
export async function getConversation(
  conversationId: string
): Promise<Conversation | null> {
  return conversations.get(conversationId) || null;
}

/**
 * List conversations for user
 */
export async function listConversations(
  tenantId: string,
  userId: string
): Promise<Conversation[]> {
  const userConversations = Array.from(conversations.values())
    .filter((c) => c.tenantId === tenantId && c.userId === userId)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return userConversations;
}

/**
 * Add message to conversation
 */
export async function addMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  citations?: any[]
): Promise<ConversationMessage> {
  const conversation = conversations.get(conversationId);

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  const message: ConversationMessage = {
    id: randomString(16),
    role,
    content,
    citations,
    timestamp: new Date(),
  };

  conversation.messages.push(message);
  conversation.updatedAt = new Date();

  // Auto-generate title from first user message
  if (conversation.messages.length === 1 && role === 'user') {
    conversation.title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
  }

  return message;
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  const conversation = conversations.get(conversationId);

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  conversation.title = title;
  conversation.updatedAt = new Date();
}

/**
 * Delete conversation
 */
export async function deleteConversation(conversationId: string): Promise<boolean> {
  return conversations.delete(conversationId);
}

/**
 * Get conversation history as prompt context
 */
export function getConversationContext(conversation: Conversation, maxMessages: number = 10): string {
  const recentMessages = conversation.messages.slice(-maxMessages);

  let context = 'Previous conversation:\n\n';

  for (const message of recentMessages) {
    context += `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}\n\n`;
  }

  return context;
}

/**
 * Clear old conversations
 */
export async function clearOldConversations(days: number = 30): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  let count = 0;

  for (const [id, conversation] of conversations.entries()) {
    if (conversation.updatedAt < cutoff) {
      conversations.delete(id);
      count++;
    }
  }

  return count;
}
