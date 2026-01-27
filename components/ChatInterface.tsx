'use client'

import { useState, useRef, useEffect } from 'react'
import SearchStatus, { useToolStatus } from './SearchStatus'
import dynamic from 'next/dynamic'
import Image from 'next/image'

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

interface ChatInterfaceProps {
  conversationId: string | null;
  onConversationUpdate: (id: string, title: string) => void;
  onNewConversation: () => void;
}

export default function ChatInterface({ 
  conversationId, 
  onConversationUpdate, 
  onNewConversation 
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverConnected, setServerConnected] = useState<boolean | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentMessageIdRef = useRef<string | null>(null);
  const textBufferRef = useRef<string>('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // Reset messages when conversation changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
    }
  }, [conversationId]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

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

    // Create new conversation if none active
    if (!conversationId) {
      onNewConversation();
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const query = input.trim();
    setInput('');
    
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    
    setIsLoading(true);

    // Update conversation title with first message
    if (conversationId && messages.length === 0) {
      const title = query.length > 30 ? query.substring(0, 30) + '...' : query;
      onConversationUpdate(conversationId, title);
    }

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
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <span className="chat-title">Conversation</span>
        </div>
        <div className="chat-header-right">
          <span className={`connection-status ${serverConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot" />
            {serverConnected ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="messages-container">
        {serverConnected === false && (
          <div className="server-error-banner">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <span>Server not connected. Run: <code>deno task server</code></span>
          </div>
        )}

        {messages.length === 0 && serverConnected !== false && (
          <div className="empty-state">
            <h2 className="empty-state-title">Hunter Research Agent</h2>
            <p className="empty-state-subtitle">Autonomous AI for comprehensive person research</p>
            <div className="quick-actions">
              <button 
                className="quick-action-btn"
                onClick={() => setInput("Who is Elon Musk?")}
              >
                <span>Who is Elon Musk?</span>
              </button>
              <button 
                className="quick-action-btn"
                onClick={() => setInput("Research Sam Altman")}
              >
                <span>Research Sam Altman</span>
              </button>
              <button 
                className="quick-action-btn"
                onClick={() => setInput("Tell me about Jensen Huang")}
              >
                <span>Tell me about Jensen Huang</span>
              </button>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.role === 'user' ? 'message-user' : 'message-assistant'}`}
          >
            <div className="message-avatar">
              {message.role === 'user' ? (
                <div className="avatar avatar-user">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              ) : (
                <div className="avatar avatar-assistant">
                  <Image 
                    src="/Hireal.png" 
                    alt="Hireal" 
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                </div>
              )}
            </div>
            <div className="message-content-wrapper">
              <div className="message-header">
                <span className="message-sender">
                  {message.role === 'user' ? 'You' : 'Hunter'}
                </span>
                <span className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {message.role === 'assistant' && message.isStreaming && (
                <SearchStatus
                  tools={toolStatus.tools}
                  isComplete={toolStatus.isComplete}
                />
              )}

              <div className="message-content">
                {message.content ? (
                  message.role === 'assistant' ? (
                    <MarkdownRenderer content={message.content} />
                  ) : (
                    <span className="whitespace-pre-wrap">{message.content}</span>
                  )
                ) : (
                  <span className="thinking-indicator">
                    <span>Thinking</span>
                    <span className="thinking-dots">
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="input-container">
        <form onSubmit={handleSubmit} className="input-form">
          <div className="input-wrapper">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Describe your hiring needs or ask a question..."
              className="chat-input"
              disabled={isLoading}
              rows={1}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || serverConnected === false}
              className="send-btn"
              aria-label="Send message"
            >
              {isLoading ? (
                <svg className="loading-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              )}
            </button>
          </div>
          <div className="input-footer">
            <span className="input-hint">Press Enter to send, Shift+Enter for new line</span>
          </div>
        </form>
      </div>
    </div>
  );
}
