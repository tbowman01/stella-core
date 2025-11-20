'use client';

import { useQuery } from '@tanstack/react-query';
import { complianceApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle2, AlertCircle, XCircle, Download, TrendingUp } from 'lucide-react';

export default function CompliancePage() {
  const { data: controls, isLoading } = useQuery({
    queryKey: ['compliance', 'controls'],
    queryFn: complianceApi.listControls,
  });

  const { data: report } = useQuery({
    queryKey: ['compliance', 'report'],
    queryFn: () => complianceApi.getReport(),
  });

  const frameworks = [
    { id: 'soc2', name: 'SOC 2 Type II', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 'cmmc', name: 'CMMC Level 2', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { id: 'nist-rmf', name: 'NIST RMF', color: 'bg-green-50 text-green-700 border-green-200' },
  ];

  const statusConfig = {
    implemented: { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-50' },
    'in-progress': { icon: AlertCircle, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    'not-started': { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50' },
  };

  const getControlsByStatus = (status: string) => {
    return controls?.filter((control: any) => control.status === status) || [];
  };

  const compliancePercentage = report?.overallCompliance || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compliance Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage compliance controls</p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Overall Compliance */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Compliance</CardTitle>
          <CardDescription>Aggregate compliance status across all frameworks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-gray-200"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${compliancePercentage * 3.52} 352`}
                  className="text-primary"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold">{Math.round(compliancePercentage)}%</span>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-3 gap-4">
              {Object.entries(statusConfig).map(([status, config]) => {
                const count = getControlsByStatus(status).length;
                const Icon = config.icon;
                return (
                  <div key={status} className={`p-4 rounded-lg ${config.bgColor}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`h-5 w-5 ${config.color}`} />
                      <span className="text-sm font-medium capitalize">{status.replace('-', ' ')}</span>
                    </div>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Framework Badges */}
      <div className="grid gap-4 md:grid-cols-3">
        {frameworks.map((framework) => (
          <Card key={framework.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Badge className={framework.color}>{framework.name}</Badge>
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Controls</span>
                  <span className="font-medium">
                    {controls?.filter((c: any) => c.framework === framework.id).length || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Compliant</span>
                  <span className="font-medium text-green-600">
                    {getControlsByStatus('implemented').filter((c: any) => c.framework === framework.id).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls List */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Controls</CardTitle>
          <CardDescription>Detailed view of all compliance controls</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading controls...</p>
            </div>
          ) : controls && controls.length > 0 ? (
            <div className="space-y-3">
              {controls.map((control: any) => {
                const config = statusConfig[control.status as keyof typeof statusConfig];
                const Icon = config.icon;

                return (
                  <div
                    key={control.id}
                    className="flex items-start gap-4 p-4 rounded-lg border hover:border-primary transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${config.bgColor}`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{control.title}</h3>
                            <Badge variant="outline" className="text-xs">
                              {control.controlId}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {control.description}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              Framework: <strong>{control.framework.toUpperCase()}</strong>
                            </span>
                            {control.category && (
                              <span className="flex items-center gap-1">
                                Category: <strong>{control.category}</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        <Badge
                          className={`${config.bgColor} ${config.color} border capitalize whitespace-nowrap`}
                        >
                          {control.status.replace('-', ' ')}
                        </Badge>
                      </div>

                      {control.notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                          <strong>Notes:</strong> {control.notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Shield className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-semibold">No controls found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Compliance controls will appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gap Analysis */}
      {report?.gaps && report.gaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Gap Analysis
            </CardTitle>
            <CardDescription>Areas requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.gaps.map((gap: any, index: number) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0" />
                  <p className="text-sm">{gap.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
