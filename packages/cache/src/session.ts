import { sessionCache } from './cache';

export interface Session {
  id: string;
  userId: string;
  tenantId: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Session management with Redis
 */
export class SessionManager {
  private ttl: number; // Session TTL in seconds

  constructor(ttl: number = 7 * 24 * 60 * 60) {
    // Default: 7 days
    this.ttl = ttl;
  }

  /**
   * Create new session
   */
  async create(session: Omit<Session, 'createdAt' | 'expiresAt'>): Promise<Session> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttl * 1000);

    const fullSession: Session = {
      ...session,
      createdAt: now,
      expiresAt,
    };

    await sessionCache.set(session.id, fullSession, this.ttl);

    return fullSession;
  }

  /**
   * Get session by ID
   */
  async get(sessionId: string): Promise<Session | null> {
    return await sessionCache.get<Session>(sessionId);
  }

  /**
   * Update session
   */
  async update(sessionId: string, updates: Partial<Session>): Promise<void> {
    const session = await this.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const updated = { ...session, ...updates };
    const remaining = await sessionCache.ttl(sessionId);

    await sessionCache.set(sessionId, updated, remaining > 0 ? remaining : this.ttl);
  }

  /**
   * Extend session TTL
   */
  async extend(sessionId: string): Promise<void> {
    const session = await this.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.expiresAt = new Date(Date.now() + this.ttl * 1000);
    await sessionCache.set(sessionId, session, this.ttl);
  }

  /**
   * Delete session (logout)
   */
  async delete(sessionId: string): Promise<void> {
    await sessionCache.delete(sessionId);
  }

  /**
   * Delete all sessions for user
   */
  async deleteUserSessions(userId: string): Promise<void> {
    // This requires scanning, which is expensive
    // Better approach: maintain user -> sessions mapping
    await sessionCache.invalidatePattern(`*${userId}*`);
  }

  /**
   * Check if session is valid
   */
  async isValid(sessionId: string): Promise<boolean> {
    const session = await this.get(sessionId);
    if (!session) return false;

    const now = new Date();
    return now < new Date(session.expiresAt);
  }
}

// Export singleton
export const sessionManager = new SessionManager();
