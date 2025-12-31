'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [serverConnected, setServerConnected] = useState<boolean | null>(null)
  const [agentStatus, setAgentStatus] = useState<string | null>(null)
  const [useWebSocket, setUseWebSocket] = useState(true) // Default to WebSocket
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const currentAssistantMessageIdRef = useRef<string | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Check server connection on mount
  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await fetch('http://localhost:8000/health', {
          method: 'GET',
        })
        setServerConnected(response.ok)
      } catch (error) {
        setServerConnected(false)
      }
    }
    checkServer()
  }, [])

  // WebSocket connection management
  useEffect(() => {
    if (useWebSocket && serverConnected) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//localhost:8000/ws`
      
      try {
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          console.log('[WebSocket] Connected')
          setServerConnected(true)
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log('[WebSocket] Received:', data)

            if (data.type === 'connected') {
              console.log('[WebSocket] Connection confirmed')
            } else if (data.type === 'status') {
              // Update agent status
              setAgentStatus(data.message || data.status)
            } else if (data.type === 'message') {
              // Update assistant message with content
              if (currentAssistantMessageIdRef.current) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === currentAssistantMessageIdRef.current
                      ? {
                          ...msg,
                          content: (msg.content || '') + data.content,
                          isStreaming: true,
                        }
                      : msg
                  )
                )
              }
            } else if (data.type === 'tool_call') {
              // Show tool call in status
              setAgentStatus(`Using ${data.toolName}...`)
            } else if (data.type === 'tool_result') {
              // Show tool result in status
              setAgentStatus('Processing results...')
            } else if (data.type === 'complete') {
              // Mark streaming as complete
              if (currentAssistantMessageIdRef.current) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === currentAssistantMessageIdRef.current
                      ? { ...msg, isStreaming: false }
                      : msg
                  )
                )
                setAgentStatus(null)
                currentAssistantMessageIdRef.current = null
              }
              setIsLoading(false)
            } else if (data.type === 'error') {
              // Handle errors
              if (currentAssistantMessageIdRef.current) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === currentAssistantMessageIdRef.current
                      ? {
                          ...msg,
                          content: msg.content
                            ? `${msg.content}\n\n⚠️ Error: ${data.message}`
                            : `Error: ${data.message}`,
                          isStreaming: false,
                        }
                      : msg
                  )
                )
                setAgentStatus(null)
                currentAssistantMessageIdRef.current = null
              }
              setIsLoading(false)
            }
          } catch (error) {
            console.error('[WebSocket] Error parsing message:', error)
          }
        }

        ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error)
          setServerConnected(false)
        }

        ws.onclose = () => {
          console.log('[WebSocket] Disconnected')
          wsRef.current = null
          // Try to reconnect after a delay
          setTimeout(() => {
            if (useWebSocket && serverConnected) {
              // Reconnection will be handled by useEffect
            }
          }, 3000)
        }

        return () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close()
          }
        }
      } catch (error) {
        console.error('[WebSocket] Failed to connect:', error)
        setServerConnected(false)
      }
    } else {
      // Close WebSocket if switching away from it
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [useWebSocket, serverConnected])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const query = input.trim()
    setInput('')
    setIsLoading(true)
    setAgentStatus('Initializing...')

    // Add placeholder assistant message
    const assistantMessageId = (Date.now() + 1).toString()
    currentAssistantMessageIdRef.current = assistantMessageId
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }
    setMessages((prev) => [...prev, assistantMessage])

    // Use WebSocket if enabled and connected
    if (useWebSocket && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          type: 'research',
          personName: query
        }))
        // WebSocket handler will update messages via onmessage
        return
      } catch (error) {
        console.error('[WebSocket] Error sending message:', error)
        // Fall back to SSE
      }
    }

    // Fall back to SSE (Server-Sent Events)
    try {
      const response = await fetch('http://localhost:8000/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ personName: userMessage.content }),
      })

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`)
      }

      if (!response.body) {
        throw new Error('Response body is null')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let hasReceivedData = false

      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) {
            // Stream ended normally
            break
          }

          hasReceivedData = true
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.trim() === '') continue
            
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.slice(6).trim()
                if (!jsonStr || jsonStr === '') continue
                
                const data = JSON.parse(jsonStr)
                
                // Skip keepalive and non-fatal warnings
                if (data.warning === true || data.type === 'keepalive') {
                  continue
                }
                
                // Handle task completion
                if (data.type === 'task_complete' || data.type === 'completed') {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, isStreaming: false }
                        : msg
                    )
                  )
                  continue
                }
                
                // Debug: log what we're receiving
                console.log('[Frontend] Received event:', {
                  type: data.type,
                  hasText: !!data.text,
                  hasContent: !!data.content,
                  hasMessage: !!data.message,
                  text: typeof data.text === 'string' ? data.text.substring(0, 50) : typeof data.text,
                  content: typeof data.content === 'string' ? data.content.substring(0, 50) : typeof data.content,
                  message: typeof data.message === 'string' ? data.message.substring(0, 50) : typeof data.message,
                  fullData: JSON.stringify(data).substring(0, 200)
                });
                
                const extracted = extractContent(data);
                console.log('[Frontend] Extracted content:', extracted ? extracted.substring(0, 100) : '(empty)');
                
                // Only update if we extracted some content
                if (extracted && extracted.trim()) {
                  // Update the assistant message with streaming content (accumulate)
                  setMessages((prev) => {
                    const updated = prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? {
                            ...msg,
                            content: accumulateContent(msg.content || '', data),
                            isStreaming: true,
                          }
                        : msg
                    );
                    const finalContent = updated.find(m => m.id === assistantMessageId)?.content || '';
                    console.log('[Frontend] Updated message content length:', finalContent.length, 'chars');
                    return updated;
                  })
                } else {
                  console.log('[Frontend] Skipping event - no extractable content');
                }
              } catch (e) {
                // Ignore parse errors for malformed JSON
                console.debug('Failed to parse SSE data:', e, line)
              }
            } else if (line.trim() === ': keepalive') {
              // Ignore keepalive messages
              continue
            }
          }
        }
      } catch (streamError) {
        // Handle stream reading errors
        if (hasReceivedData) {
          // If we got some data, it's a partial success
          console.warn('Stream interrupted but data was received:', streamError)
        } else {
          throw streamError
        }
      } finally {
        // Mark streaming as complete
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, isStreaming: false }
              : msg
          )
        )
      }
    } catch (error) {
      let errorMessage = 'Unknown error occurred'
      
      if (error instanceof TypeError) {
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          errorMessage = 'Cannot connect to server. Please make sure the Deno server is running on port 8000.\n\nRun: deno task server'
          setServerConnected(false)
        } else if (error.message.includes('network') || error.message.includes('suspended')) {
          errorMessage = 'Network connection was interrupted. The server may still be processing your request.\n\nPlease try again or check the server logs.'
        } else {
          errorMessage = `Network error: ${error.message}`
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: msg.content 
                  ? `${msg.content}\n\n⚠️ Connection interrupted: ${errorMessage}`
                  : `Error: ${errorMessage}`,
                isStreaming: false,
              }
            : msg
        )
      )
    } finally {
      setIsLoading(false)
      setAgentStatus(null)
      currentAssistantMessageIdRef.current = null
    }
  }

  const extractContent = (data: any): string => {
    // Build a comprehensive message from agent events
    let message = '';
    
    // Helper to recursively find text in nested objects
    const findTextInObject = (obj: any, depth = 0): string => {
      if (depth > 3) return ''; // Limit recursion depth
      if (!obj || typeof obj !== 'object') return '';
      
      // Check direct text fields
      if (typeof obj.text === 'string' && obj.text.trim()) return obj.text;
      if (typeof obj.content === 'string' && obj.content.trim()) return obj.content;
      if (typeof obj.message === 'string' && obj.message.trim()) return obj.message;
      
      // Check content arrays
      if (Array.isArray(obj.content)) {
        const textParts = obj.content
          .filter((item: any) => item && item.type === 'text' && typeof item.text === 'string')
          .map((item: any) => item.text);
        if (textParts.length > 0) return textParts.join('');
      }
      
      // Recursively check nested objects
      for (const key in obj) {
        if (obj.hasOwnProperty(key) && typeof obj[key] === 'object' && obj[key] !== null) {
          const found = findTextInObject(obj[key], depth + 1);
          if (found) return found;
        }
      }
      
      return '';
    };
    
    // First, try to extract text content directly (highest priority)
    if (typeof data.text === 'string' && data.text.trim()) {
      return data.text;
    }
    
    if (typeof data.content === 'string' && data.content.trim()) {
      return data.content;
    }
    
    // Handle message type - could be user or assistant message
    if (data.type === 'message' || (data.message && typeof data.message === 'object')) {
      const msgObj = data.message || data;
      // Extract text from message content array
      if (msgObj.content && Array.isArray(msgObj.content)) {
        const textParts = msgObj.content
          .filter((item: any) => item && item.type === 'text' && typeof item.text === 'string')
          .map((item: any) => item.text);
        if (textParts.length > 0) {
          return textParts.join('');
        }
      } else if (msgObj.content && typeof msgObj.content === 'string') {
        return msgObj.content;
      } else if (msgObj.text && typeof msgObj.text === 'string') {
        return msgObj.text;
      }
    }
    
    // Try recursive search for text in nested structures
    const foundText = findTextInObject(data);
    if (foundText) {
      return foundText;
    }
    
    // Handle different event types
    if (data.type === 'tool_call') {
      message += `🔧 Using tool: ${data.tool_name || 'unknown'}\n`;
      if (data.arguments) {
        const args = typeof data.arguments === 'string' ? data.arguments : JSON.stringify(data.arguments);
        message += `   Arguments: ${args.substring(0, 100)}${args.length > 100 ? '...' : ''}\n`;
      }
    } else if (data.type === 'tool_result') {
      message += `✅ Tool result received\n`;
      if (data.result) {
        const result = typeof data.result === 'string' ? data.result : JSON.stringify(data.result);
        message += `   ${result.substring(0, 200)}${result.length > 200 ? '...' : ''}\n`;
      }
    } else if (data.type === 'tool_error_retry') {
      message += `⚠️ ${data.message || 'Tool error, retrying...'}\n`;
    } else if (data.type === 'timeout_warning') {
      message += `⏱️ ${data.message || 'Agent appears to be taking longer than expected...'}\n`;
    } else if (data.type === 'text') {
      // Regular text content - check all possible fields
      if (data.message && typeof data.message === 'object' && data.message.text) {
        message += data.message.text;
      } else if (data.message && typeof data.message === 'string') {
        message += data.message;
      }
    } else if (data.type === 'task_complete' || data.type === 'task_result') {
      message += `\n✅ Task Complete\n`;
      if (data.result) {
        message += data.result;
      } else if (data.content) {
        message += data.content;
      }
    } else {
      // For other events, try to extract any text content
      if (data.message && typeof data.message === 'string') {
        message += data.message;
      } else if (data.tool_name) {
        message += `Tool: ${data.tool_name}`;
      }
      // Don't add type prefix - it's not useful for display
    }
    
    return message;
  }
  
  // Accumulate content instead of replacing
  const accumulateContent = (currentContent: string, newData: any): string => {
    const newContent = extractContent(newData);
    if (!newContent || newContent.trim() === '') return currentContent;
    
    // If current content is empty, just use new content
    if (!currentContent || currentContent.trim() === '') {
      return newContent;
    }
    
    // For text/message content, append incrementally (for streaming)
    // Check if this is a text chunk that should be appended
    const isTextContent = newData.type === 'text' || 
                         newData.type === 'message' || 
                         (typeof newData.text === 'string') ||
                         (typeof newData.content === 'string' && !newData.type);
    
    if (isTextContent) {
      // For streaming text, check if newContent is a continuation or duplicate
      // Only skip if the entire newContent already exists in currentContent
      // (not just the first 50 chars, which was too aggressive)
      if (currentContent.includes(newContent)) {
        return currentContent; // Exact duplicate, skip
      }
      
      // Check if newContent is a prefix of currentContent (backwards duplicate)
      if (newContent.length > 10 && currentContent.startsWith(newContent)) {
        return currentContent; // New content is already at the start, skip
      }
      
      // For streaming text, append without separator (continuous text)
      return currentContent + newContent;
    }
    
    // If it's a tool call or result, append to show progress
    if (newData.type === 'tool_call' || newData.type === 'tool_result' || newData.type === 'tool_error_retry' || newData.type === 'timeout_warning') {
      return currentContent + '\n\n' + newContent;
    }
    
    // For task complete, replace everything
    if (newData.type === 'task_complete' || newData.type === 'task_result') {
      return newContent;
    }
    
    // Default: append with separator
    return currentContent + '\n\n' + newContent;
  }

  return (
    <div className="glass rounded-xl shadow-lg w-full h-[600px] flex flex-col overflow-hidden">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {serverConnected === false && (
          <div className="glass rounded-xl p-4 mb-4 border-2" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 mt-0.5 flex-shrink-0"
                style={{ color: '#ef4444' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium mb-1" style={{ color: '#ef4444' }}>
                  Server Not Connected
                </p>
                <p className="text-xs text-secondary">
                  The backend server is not running. Please start it with:
                </p>
                <code className="text-xs mt-2 block glass rounded px-2 py-1" style={{ color: '#ef4444' }}>
                  deno task server
                </code>
              </div>
            </div>
          </div>
        )}
        
        {/* Agent Status Display */}
        {agentStatus && (
          <div className="glass rounded-xl p-3 mb-4 border-2" style={{ borderColor: 'rgba(59, 130, 246, 0.3)' }}>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              <span className="text-sm text-secondary">{agentStatus}</span>
            </div>
          </div>
        )}

        {messages.length === 0 && serverConnected !== false && (
          <div className="text-center text-secondary py-12">
            <div className="mb-4">
              <svg
                className="w-16 h-16 mx-auto opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <p className="text-lg mb-2">Start a research query</p>
            <p className="text-sm">
              Enter a person's name to begin autonomous research
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            } fade-in`}
          >
            <div
              className={`max-w-[80%] rounded-2xl p-4 shadow-md ${
                message.role === 'user'
                  ? 'glass bg-glass-hover'
                  : 'glass metallic'
              }`}
            >
              <div className="text-sm text-secondary mb-1">
                {message.role === 'user' ? 'You' : 'Agent'}
              </div>
              <div className="text-primary whitespace-pre-wrap">
                {message.content || (
                  <span className="flex items-center gap-2">
                    <span className="animate-pulse">Thinking...</span>
                    <span className="flex gap-1">
                      <span className="w-2 h-2 bg-secondary rounded-full animate-pulse"></span>
                      <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                      <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="border-t p-4 glass" style={{ borderColor: 'var(--border-color)' }}>
        {/* Connection Mode Toggle */}
        <div className="flex items-center gap-2 mb-3 text-xs text-secondary">
          <span>Connection:</span>
          <button
            type="button"
            onClick={() => setUseWebSocket(!useWebSocket)}
            className={`px-2 py-1 rounded ${
              useWebSocket
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-gray-500/20 text-gray-400'
            }`}
          >
            {useWebSocket ? 'WebSocket' : 'SSE'}
          </button>
          {useWebSocket && wsRef.current && (
            <span className={`text-xs ${wsRef.current.readyState === WebSocket.OPEN ? 'text-green-400' : 'text-red-400'}`}>
              {wsRef.current.readyState === WebSocket.OPEN ? '● Connected' : '● Disconnected'}
            </span>
          )}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            ref={inputRef}
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
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="animate-pulse">Searching</span>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
              </span>
            ) : (
              'Research'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

