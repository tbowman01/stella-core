'use client';

import { useQuery } from '@tanstack/react-query';
import { pqcApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, Shield, Key, AlertTriangle } from 'lucide-react';

export default function PQCStatusPage() {
  const { data: qbom } = useQuery({
    queryKey: ['pqc', 'qbom'],
    queryFn: pqcApi.getQBOM,
  });

  const { data: migrationStatus } = useQuery({
    queryKey: ['pqc', 'migration'],
    queryFn: pqcApi.getMigrationStatus,
  });

  const pqcAlgorithms = ['ML-KEM-768', 'ML-KEM-1024', 'ML-DSA-65', 'ML-DSA-87'];
  const classicalAlgorithms = ['RSA-2048', 'RSA-4096', 'ECDSA-P256', 'AES-256-GCM'];

  const migrationProgress = migrationStatus?.progress || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Post-Quantum Cryptography</h1>
        <p className="text-muted-foreground">
          Quantum-ready encryption status and migration progress
        </p>
      </div>

      {/* Migration Progress */}
      <Card>
        <CardHeader>
          <CardTitle>PQC Migration Progress</CardTitle>
          <CardDescription>Transition to quantum-resistant algorithms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm font-semibold">{Math.round(migrationProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-primary h-4 rounded-full transition-all"
                  style={{ width: `${migrationProgress}%` }}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span className="font-semibold">PQC Protected</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {qbom?.filter((entry: any) => pqcAlgorithms.includes(entry.algorithm)).length || 0}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Documents using quantum-resistant encryption
                </p>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span className="font-semibold">Legacy Crypto</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600">
                  {qbom?.filter((entry: any) => classicalAlgorithms.includes(entry.algorithm)).length || 0}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Documents pending migration
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Algorithm Usage */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Post-Quantum Algorithms
            </CardTitle>
            <CardDescription>NIST-approved quantum-resistant cryptography</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pqcAlgorithms.map((algorithm) => {
                const count =
                  qbom?.filter((entry: any) => entry.algorithm === algorithm).length || 0;
                const type = algorithm.startsWith('ML-KEM') ? 'Key Encapsulation' : 'Digital Signature';
                return (
                  <div key={algorithm} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Key className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">{algorithm}</p>
                        <p className="text-xs text-muted-foreground">{type}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-white">
                      {count} uses
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Classical Algorithms
            </CardTitle>
            <CardDescription>Legacy cryptography pending migration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {classicalAlgorithms.map((algorithm) => {
                const count =
                  qbom?.filter((entry: any) => entry.algorithm === algorithm).length || 0;
                return (
                  <div key={algorithm} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Lock className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium">{algorithm}</p>
                        <p className="text-xs text-muted-foreground">Classical</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-white">
                      {count} uses
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QBOM (Quantum Bill of Materials) */}
      <Card>
        <CardHeader>
          <CardTitle>Quantum Bill of Materials (QBOM)</CardTitle>
          <CardDescription>Comprehensive inventory of cryptographic algorithms in use</CardDescription>
        </CardHeader>
        <CardContent>
          {qbom && qbom.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-sm">Component</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Algorithm</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Key Size</th>
                  </tr>
                </thead>
                <tbody>
                  {qbom.slice(0, 20).map((entry: any, index: number) => {
                    const isPQC = pqcAlgorithms.includes(entry.algorithm);
                    return (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">{entry.component}</td>
                        <td className="py-3 px-4 text-sm font-medium">{entry.algorithm}</td>
                        <td className="py-3 px-4 text-sm">{entry.type}</td>
                        <td className="py-3 px-4">
                          <Badge
                            className={isPQC ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}
                          >
                            {isPQC ? 'Quantum-Safe' : 'Classical'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {entry.keySize || 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Shield className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-semibold">No QBOM entries</p>
              <p className="text-sm text-muted-foreground mt-1">
                Cryptographic usage will be tracked here
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <Shield className="h-6 w-6 text-blue-600 shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">
                Preparing for the Quantum Future
              </h3>
              <p className="text-sm text-blue-700">
                ArcQubit uses NIST-approved post-quantum cryptographic algorithms (ML-KEM and ML-DSA)
                to protect your data against future quantum computer attacks. All new documents are
                automatically encrypted with hybrid PQC+classical encryption for defense-in-depth.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
