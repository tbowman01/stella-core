'use client';

import { useQuery } from '@tanstack/react-query';
import { documentsApi, auditApi, workspacesApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Folder, Activity, TrendingUp } from 'lucide-react';
import { formatRelativeTime, formatBytes, getClassificationColor, getFileIcon } from '@/lib/utils';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: documents } = useQuery({
    queryKey: ['documents', 'recent'],
    queryFn: () => documentsApi.list({ limit: 5 }),
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['audit', 'recent'],
    queryFn: () => auditApi.list({ limit: 10 }),
  });

  const { data: workspaces } = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspacesApi.list,
  });

  const stats = [
    {
      name: 'Total Documents',
      value: documents?.total || 0,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      name: 'Workspaces',
      value: workspaces?.length || 0,
      icon: Folder,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      name: 'Recent Activity',
      value: auditLogs?.length || 0,
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      name: 'Storage Used',
      value: formatBytes(documents?.totalSize || 0),
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your ArcQubit knowledge work platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                  <p className="text-2xl font-bold mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Documents</CardTitle>
            <CardDescription>Your recently uploaded or modified documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {documents?.results?.map((doc: any) => (
                <Link
                  key={doc.id}
                  href={`/dashboard/documents/${doc.id}`}
                  className="flex items-start justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-2xl">{getFileIcon(doc.fileType)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(doc.fileSize)} • {formatRelativeTime(doc.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <Badge className={getClassificationColor(doc.classification)}>
                    {doc.classification}
                  </Badge>
                </Link>
              ))}

              {(!documents?.results || documents.results.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No documents yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Feed</CardTitle>
            <CardDescription>Recent actions in your workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {auditLogs?.map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{log.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.userId} • {formatRelativeTime(log.timestamp)}
                    </p>
                    {log.metadata && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {JSON.stringify(log.metadata).slice(0, 100)}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {(!auditLogs || auditLogs.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Link
              href="/dashboard/documents/upload"
              className="p-4 rounded-lg border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-colors text-center"
            >
              <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="font-medium">Upload Document</p>
              <p className="text-xs text-muted-foreground mt-1">Add new files</p>
            </Link>

            <Link
              href="/dashboard/ai"
              className="p-4 rounded-lg border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-colors text-center"
            >
              <Activity className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="font-medium">Ask AI Assistant</p>
              <p className="text-xs text-muted-foreground mt-1">Query documents</p>
            </Link>

            <Link
              href="/dashboard/workspaces"
              className="p-4 rounded-lg border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-colors text-center"
            >
              <Folder className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="font-medium">Create Workspace</p>
              <p className="text-xs text-muted-foreground mt-1">Organize files</p>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
