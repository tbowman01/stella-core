'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Bot, User, FileText, Sparkles } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

export default function AIAssistantPage() {
  const [query, setQuery] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: aiApi.listConversations,
  });

  const { data: currentConversation } = useQuery({
    queryKey: ['conversation', currentConversationId],
    queryFn: () => aiApi.getConversation(currentConversationId!),
    enabled: !!currentConversationId,
  });

  const queryMutation = useMutation({
    mutationFn: (params: { query: string; conversationId?: string }) => aiApi.query(params),
    onSuccess: (data) => {
      setQuery('');
      if (data.conversationId) {
        setCurrentConversationId(data.conversationId);
      }
      queryClient.invalidateQueries({ queryKey: ['conversation', currentConversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => {
      toast.error('Failed to get response from AI');
    },
  });

  const createConversationMutation = useMutation({
    mutationFn: () => aiApi.createConversation(),
    onSuccess: (data) => {
      setCurrentConversationId(data.id);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('New conversation started');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (!currentConversationId) {
      createConversationMutation.mutate();
    }

    queryMutation.mutate({
      query,
      conversationId: currentConversationId || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
        <p className="text-muted-foreground">
          Ask questions about your documents using RAG-powered AI
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Conversations Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Conversations</CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => createConversationMutation.mutate()}
              >
                +
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {conversations?.map((conv: any) => (
                <button
                  key={conv.id}
                  onClick={() => setCurrentConversationId(conv.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    currentConversationId === conv.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <p className="font-medium text-sm truncate">{conv.title}</p>
                  <p className="text-xs opacity-75">{formatRelativeTime(conv.updatedAt)}</p>
                </button>
              ))}

              {(!conversations || conversations.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No conversations yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chat Interface */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {currentConversation?.title || 'New Conversation'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col h-[600px]">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {currentConversation?.messages?.map((message: any, index: number) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                        <Bot className="h-5 w-5" />
                      </div>
                    )}

                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-gray-100'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                      {message.citations && message.citations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs font-semibold mb-2">Sources:</p>
                          <div className="space-y-1">
                            {message.citations.map((citation: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <FileText className="h-3 w-3" />
                                <span>{citation.documentName}</span>
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(citation.relevance * 100)}%
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {message.redactedEntities && message.redactedEntities.length > 0 && (
                        <div className="mt-2">
                          <Badge variant="destructive" className="text-xs">
                            PHI/PII Redacted: {message.redactedEntities.length} entities
                          </Badge>
                        </div>
                      )}
                    </div>

                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">
                        <User className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                ))}

                {queryMutation.isPending && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div className="bg-gray-100 rounded-lg p-4">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                )}

                {!currentConversation && !queryMutation.isPending && (
                  <div className="text-center py-12">
                    <Sparkles className="h-16 w-16 mx-auto mb-4 text-primary opacity-20" />
                    <p className="text-lg font-semibold">Ask me anything!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      I can help you find information in your documents
                    </p>
                  </div>
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  placeholder="Ask a question about your documents..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={queryMutation.isPending}
                  className="flex-1"
                />
                <Button type="submit" disabled={!query.trim() || queryMutation.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>

              <p className="text-xs text-muted-foreground mt-2 text-center">
                Powered by Claude 3.5 Sonnet • PHI/PII redaction enabled • RAG with semantic search
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
