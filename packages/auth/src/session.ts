/**
 * Session management
 */

import { AuthSession } from './types';
import { randomString } from '@arcqubit/shared';

// In-memory session store (for development)
// In production, use Redis or database
const sessionStore = new Map<string, AuthSession>();

/**
 * Create a new session
 */
export async function createSession(
  userId: string,
  tenantId: string,
  token: string,
  refreshToken: string,
  options: {
    ipAddress?: string;
    userAgent?: string;
    expiresIn?: number; // milliseconds
  } = {}
): Promise<AuthSession> {
  const sessionId = randomString(32);
  const expiresIn = options.expiresIn || 7 * 24 * 60 * 60 * 1000; // 7 days default

  const session: AuthSession = {
    id: sessionId,
    userId,
    tenantId,
    token,
    refreshToken,
    expiresAt: new Date(Date.now() + expiresIn),
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    createdAt: new Date(),
  };

  sessionStore.set(sessionId, session);

  return session;
}

/**
 * Get session by ID
 */
export async function getSession(sessionId: string): Promise<AuthSession | null> {
  const session = sessionStore.get(sessionId);

  if (!session) {
    return null;
  }

  // Check if session is expired
  if (session.expiresAt < new Date()) {
    sessionStore.delete(sessionId);
    return null;
  }

  return session;
}

/**
 * Get session by user ID
 */
export async function getSessionsByUserId(userId: string): Promise<AuthSession[]> {
  const sessions: AuthSession[] = [];

  for (const session of sessionStore.values()) {
    if (session.userId === userId && session.expiresAt > new Date()) {
      sessions.push(session);
    }
  }

  return sessions;
}

/**
 * Update session
 */
export async function updateSession(
  sessionId: string,
  updates: Partial<AuthSession>
): Promise<AuthSession | null> {
  const session = sessionStore.get(sessionId);

  if (!session) {
    return null;
  }

  const updatedSession = { ...session, ...updates };
  sessionStore.set(sessionId, updatedSession);

  return updatedSession;
}

/**
 * Delete session (logout)
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  return sessionStore.delete(sessionId);
}

/**
 * Delete all sessions for a user
 */
export async function deleteUserSessions(userId: string): Promise<number> {
  let count = 0;

  for (const [sessionId, session] of sessionStore.entries()) {
    if (session.userId === userId) {
      sessionStore.delete(sessionId);
      count++;
    }
  }

  return count;
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  let count = 0;
  const now = new Date();

  for (const [sessionId, session] of sessionStore.entries()) {
    if (session.expiresAt < now) {
      sessionStore.delete(sessionId);
      count++;
    }
  }

  return count;
}

/**
 * Get session count
 */
export async function getSessionCount(): Promise<number> {
  return sessionStore.size;
}

/**
 * Extend session expiration
 */
export async function extendSession(
  sessionId: string,
  extensionMs: number = 7 * 24 * 60 * 60 * 1000 // 7 days
): Promise<AuthSession | null> {
  const session = sessionStore.get(sessionId);

  if (!session) {
    return null;
  }

  const newExpiresAt = new Date(Date.now() + extensionMs);
  return updateSession(sessionId, { expiresAt: newExpiresAt });
}
