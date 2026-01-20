'use client'

import { useState, useRef, useEffect } from 'react'
import SearchStatus, { useToolStatus } from './SearchStatus'
import dynamic from 'next/dynamic'

const MarkdownRenderer = dynamic(() => import('./MarkdownRenderer'), { ssr: false })

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface StreamEvent {
  category: string;
  content?: string;
  toolId?: string;
  toolName?: string;
  displayName?: string;
  message?: string;
  duration?: number;
  toolsUsed?: number;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverConnected, setServerConnected] = useState<boolean | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentMessageIdRef = useRef<string | null>(null);
  const textBufferRef = useRef<string>('');

  const toolStatus = useToolStatus();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetch('/api/health')
      .then(res => setServerConnected(res.ok))
      .catch(() => setServerConnected(false));
  }, []);

  const handleStreamEvent = (event: StreamEvent) => {
    console.log('[Event received]', event);

    const messageId = currentMessageIdRef.current;
    if (!messageId) return;

    switch (event.category) {
      case 'assistant_text':
        if (event.content) {
          textBufferRef.current += event.content;
          setMessages(prev => prev.map(msg =>
            msg.id === messageId
              ? { ...msg, content: textBufferRef.current, isStreaming: true }
              : msg
          ));
        }
        break;

      case 'tool_start':
        if (event.toolId && event.toolName) {
          toolStatus.addTool(
            event.toolId,
            event.toolName,
            event.displayName || event.toolName
          );
        }
        break;

      case 'tool_complete':
        if (event.toolId) {
          toolStatus.completeTool(event.toolId);
        }
        break;

      case 'tool_error':
        if (event.toolId) {
          toolStatus.errorTool(event.toolId, event.message || 'Error');
        }
        break;

      case 'complete':
        toolStatus.markComplete();
        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? { ...msg, isStreaming: false }
            : msg
        ));
        setIsLoading(false);
        break;

      case 'error':
        toolStatus.markComplete();
        const errorContent = textBufferRef.current
          ? `${textBufferRef.current}\n\n⚠️ ${event.message}`
          : `⚠️ ${event.message}`;
        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? { ...msg, content: errorContent, isStreaming: false }
            : msg
        ));
        setIsLoading(false);
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const query = input.trim();
    setInput('');
    setIsLoading(true);

    textBufferRef.current = '';
    toolStatus.reset();

    const assistantId = (Date.now() + 1).toString();
    currentMessageIdRef.current = assistantId;

    setMessages(prev => [
      ...prev,
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      },
    ]);

    try {
      // Use the Next.js API route as a proxy
      const endpoint = '/api/research';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personName: query }),
      });

      console.log('[Response status]', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || `Server error: ${response.status}`;

        if (response.status === 429 || errorMsg.includes('rate_limit')) {
          throw new Error('Too many requests. Please try again in about 1 minute.');
        }

        throw new Error(errorMsg);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('[Stream done]');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        console.log('[Raw chunk]', chunk);

        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const evt = JSON.parse(line.slice(6)) as StreamEvent;
              handleStreamEvent(evt);
            } catch (err) {
              console.log('[Parse error]', err, line);
            }
          }
        }
      }

      setMessages(prev => prev.map(msg =>
        msg.id === assistantId ? { ...msg, isStreaming: false } : msg
      ));
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      setMessages(prev => prev.map(msg =>
        msg.id === assistantId
          ? { ...msg, content: `⚠️ ${errMsg}`, isStreaming: false }
          : msg
      ));
    } finally {
      setIsLoading(false);
      currentMessageIdRef.current = null;
    }
  };

  return (
    <div className="glass rounded-xl shadow-lg w-full h-full flex flex-col overflow-hidden">
      <div
        className="flex-shrink-0 px-4 py-2 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--border-color)', background: 'rgba(0, 0, 0, 0.2)' }}
      >
        <span className="text-xs text-secondary font-medium uppercase tracking-wider">
          Research Agent
        </span>
        <span
          className={`flex items-center gap-1.5 text-xs font-medium ${
            serverConnected ? 'text-emerald-400' : 'text-gray-500'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              serverConnected ? 'bg-emerald-400' : 'bg-gray-500'
            }`}
          />
          {serverConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
        {serverConnected === false && (
          <div
            className="glass rounded-xl p-4 mb-4 border-2"
            style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}
          >
            <p className="text-sm" style={{ color: '#ef4444' }}>
              ⚠️ Server not connected. Run: <code>deno task server</code>
            </p>
          </div>
        )}

        {messages.length === 0 && serverConnected !== false && (
          <div className="text-center text-secondary py-12">
            <p className="text-lg mb-2">Start a research query</p>
            <p className="text-sm">Enter a person's name to begin</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div className="max-w-[80%] space-y-2">
              {message.role === 'assistant' && message.isStreaming && (
                <SearchStatus
                  tools={toolStatus.tools}
                  isComplete={toolStatus.isComplete}
                />
              )}

              <div
                className={`rounded-2xl p-4 shadow-md ${
                  message.role === 'user' ? 'glass bg-glass-hover' : 'glass metallic'
                }`}
              >
                <div className="text-sm text-secondary mb-1">
                  {message.role === 'user' ? 'You' : 'Agent'}
                </div>

                <div className="text-primary">
                  {message.content ? (
                    message.role === 'assistant' ? (
                      <MarkdownRenderer content={message.content} />
                    ) : (
                      <span className="whitespace-pre-wrap">{message.content}</span>
                    )
                  ) : (
                    <span className="flex items-center gap-2 text-secondary">
                      <span>Thinking...</span>
                      <span className="flex gap-1">
                        <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                        <span
                          className="w-2 h-2 bg-secondary rounded-full animate-pulse"
                          style={{ animationDelay: '0.2s' }}
                        />
                        <span
                          className="w-2 h-2 bg-secondary rounded-full animate-pulse"
                          style={{ animationDelay: '0.4s' }}
                        />
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div
        className="flex-shrink-0 border-t p-4 glass"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter person's name to research..."
            className="input flex-1"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || serverConnected === false}
            className="btn btn-primary rounded-lg px-6"
          >
            {isLoading ? 'Searching...' : 'Research'}
          </button>
        </form>
      </div>
    </div>
  );
}
