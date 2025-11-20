'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { documentsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Upload, Download, Trash2, Filter } from 'lucide-react';
import { formatDate, formatBytes, getClassificationColor, getFileIcon } from '@/lib/utils';
import Link from 'next/link';

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassification, setSelectedClassification] = useState<string | null>(null);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsApi.list({}),
  });

  const filteredDocuments = documents?.results?.filter((doc: any) => {
    const matchesSearch =
      !searchQuery ||
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.contentText?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClassification =
      !selectedClassification || doc.classification === selectedClassification;

    return matchesSearch && matchesClassification;
  });

  const classifications = ['public', 'internal', 'confidential', 'restricted'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">Manage and organize your documents</p>
        </div>
        <Link href="/dashboard/documents/upload">
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant={selectedClassification === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedClassification(null)}
              >
                All
              </Button>
              {classifications.map((classification) => (
                <Button
                  key={classification}
                  variant={selectedClassification === classification ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedClassification(classification)}
                >
                  {classification}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            All Documents ({filteredDocuments?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading documents...</p>
            </div>
          ) : filteredDocuments && filteredDocuments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-sm">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Classification</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Size</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Modified</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((doc: any) => (
                    <tr key={doc.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getFileIcon(doc.fileType)}</span>
                          <div>
                            <Link
                              href={`/dashboard/documents/${doc.id}`}
                              className="font-medium hover:text-primary"
                            >
                              {doc.name}
                            </Link>
                            <p className="text-xs text-muted-foreground">{doc.fileType}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getClassificationColor(doc.classification)}>
                          {doc.classification}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm">{formatBytes(doc.fileSize)}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {formatDate(doc.updatedAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => documentsApi.download(doc.id)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => documentsApi.delete(doc.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-semibold">No documents found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || selectedClassification
                  ? 'Try adjusting your filters'
                  : 'Upload your first document to get started'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
