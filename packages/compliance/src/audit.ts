/**
 * Audit logging service
 * Provides comprehensive audit trail for compliance
 */

import { prisma } from '@arcqubit/database';
import { AuditAction } from '@arcqubit/shared';
import { AuditQuery, AuditSummary } from './types';

/**
 * Create audit log entry
 */
export async function createAuditLog(params: {
  tenantId: string;
  userId: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      metadata: params.metadata || {},
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
}

/**
 * Query audit logs
 */
export async function queryAuditLogs(query: AuditQuery) {
  const where: any = {
    tenantId: query.tenantId,
  };

  if (query.userId) {
    where.userId = query.userId;
  }

  if (query.action) {
    where.action = query.action;
  }

  if (query.resourceType) {
    where.resourceType = query.resourceType;
  }

  if (query.resourceId) {
    where.resourceId = query.resourceId;
  }

  if (query.startDate || query.endDate) {
    where.timestamp = {};
    if (query.startDate) {
      where.timestamp.gte = query.startDate;
    }
    if (query.endDate) {
      where.timestamp.lte = query.endDate;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: query.limit || 100,
      skip: query.offset || 0,
      include: {
        user: {
          select: {
            email: true,
            fullName: true,
            role: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page: Math.floor((query.offset || 0) / (query.limit || 100)) + 1,
    pages: Math.ceil(total / (query.limit || 100)),
  };
}

/**
 * Get audit summary for a time period
 */
export async function getAuditSummary(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<AuditSummary> {
  const logs = await prisma.auditLog.findMany({
    where: {
      tenantId,
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      userId: true,
      action: true,
      resourceType: true,
    },
  });

  // Count unique users
  const uniqueUsers = new Set(logs.map((l) => l.userId).filter(Boolean)).size;

  // Count actions
  const actionCounts = new Map<string, number>();
  for (const log of logs) {
    actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1);
  }

  const topActions = Array.from(actionCounts.entries())
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Count resource types
  const resourceCounts = new Map<string, number>();
  for (const log of logs) {
    if (log.resourceType) {
      resourceCounts.set(log.resourceType, (resourceCounts.get(log.resourceType) || 0) + 1);
    }
  }

  const topResources = Array.from(resourceCounts.entries())
    .map(([resourceType, count]) => ({ resourceType, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalEvents: logs.length,
    uniqueUsers,
    topActions,
    topResources,
    timeRange: { start: startDate, end: endDate },
  };
}

/**
 * Export audit logs for compliance
 */
export async function exportAuditLogs(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  format: 'json' | 'csv' = 'json'
): Promise<string> {
  const logs = await prisma.auditLog.findMany({
    where: {
      tenantId,
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { timestamp: 'asc' },
    include: {
      user: {
        select: {
          email: true,
          fullName: true,
          role: true,
        },
      },
    },
  });

  if (format === 'json') {
    return JSON.stringify(logs, null, 2);
  }

  // CSV export
  if (logs.length === 0) {
    return 'timestamp,user_email,action,resource_type,resource_id,ip_address\n';
  }

  const headers = [
    'timestamp',
    'user_email',
    'user_name',
    'action',
    'resource_type',
    'resource_id',
    'ip_address',
  ];

  const rows = logs.map((log) => [
    log.timestamp.toISOString(),
    log.user?.email || '',
    log.user?.fullName || '',
    log.action,
    log.resourceType || '',
    log.resourceId || '',
    log.ipAddress || '',
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

/**
 * Get user activity report
 */
export async function getUserActivityReport(
  tenantId: string,
  userId: string,
  days: number = 30
): Promise<{
  userId: string;
  totalActions: number;
  actionBreakdown: { action: string; count: number }[];
  recentActivity: any[];
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const logs = await prisma.auditLog.findMany({
    where: {
      tenantId,
      userId,
      timestamp: {
        gte: startDate,
      },
    },
    orderBy: { timestamp: 'desc' },
  });

  const actionCounts = new Map<string, number>();
  for (const log of logs) {
    actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1);
  }

  const actionBreakdown = Array.from(actionCounts.entries())
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count);

  return {
    userId,
    totalActions: logs.length,
    actionBreakdown,
    recentActivity: logs.slice(0, 50),
  };
}

/**
 * Detect suspicious activity patterns
 */
export async function detectSuspiciousActivity(
  tenantId: string,
  hours: number = 24
): Promise<
  Array<{
    userId: string;
    suspiciousPattern: string;
    details: any;
  }>
> {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - hours);

  const logs = await prisma.auditLog.findMany({
    where: {
      tenantId,
      timestamp: {
        gte: startDate,
      },
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  const suspicious: Array<{
    userId: string;
    suspiciousPattern: string;
    details: any;
  }> = [];

  // Pattern 1: Excessive failed logins
  const failedLogins = logs.filter((l) => l.action === 'login_failed');
  const failedLoginsByUser = new Map<string, number>();

  for (const log of failedLogins) {
    if (log.userId) {
      failedLoginsByUser.set(log.userId, (failedLoginsByUser.get(log.userId) || 0) + 1);
    }
  }

  for (const [userId, count] of failedLoginsByUser.entries()) {
    if (count >= 10) {
      suspicious.push({
        userId,
        suspiciousPattern: 'Excessive failed logins',
        details: { failedAttempts: count, timeWindow: `${hours} hours` },
      });
    }
  }

  // Pattern 2: Bulk downloads
  const downloads = logs.filter((l) => l.action === 'download');
  const downloadsByUser = new Map<string, number>();

  for (const log of downloads) {
    if (log.userId) {
      downloadsByUser.set(log.userId, (downloadsByUser.get(log.userId) || 0) + 1);
    }
  }

  for (const [userId, count] of downloadsByUser.entries()) {
    if (count >= 50) {
      suspicious.push({
        userId,
        suspiciousPattern: 'Bulk downloads detected',
        details: { downloadCount: count, timeWindow: `${hours} hours` },
      });
    }
  }

  // Pattern 3: Access from multiple IPs
  const userIPs = new Map<string, Set<string>>();
  for (const log of logs) {
    if (log.userId && log.ipAddress) {
      if (!userIPs.has(log.userId)) {
        userIPs.set(log.userId, new Set());
      }
      userIPs.get(log.userId)!.add(log.ipAddress);
    }
  }

  for (const [userId, ips] of userIPs.entries()) {
    if (ips.size >= 5) {
      suspicious.push({
        userId,
        suspiciousPattern: 'Access from multiple IP addresses',
        details: { ipCount: ips.size, timeWindow: `${hours} hours` },
      });
    }
  }

  return suspicious;
}
