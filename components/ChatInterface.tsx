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
  const [useWebSocket, setUseWebSocket] = useState(false) // Default to SSE (WebSocket not supported on Vercel)
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
        const response = await fetch('/api/health', {
          method: 'GET',
        })
        setServerConnected(response.ok)
      } catch (error) {
        setServerConnected(false)
      }
    }
    checkServer()
  }, [])

  // WebSocket connection management (disabled on Vercel - WebSocket not supported)
  useEffect(() => {
    if (useWebSocket && serverConnected) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.host
      const wsUrl = `${protocol}//${host}/ws`
      
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
              // Mark streaming as complete and clean final message
              if (currentAssistantMessageIdRef.current) {
                setMessages((prev) =>
                  prev.map((msg) => {
                    if (msg.id === currentAssistantMessageIdRef.current) {
                      // Clean the final message to remove duplicates
                      const cleanFinalMessage = (text: string): string => {
                        if (!text) return text;
                        const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 0);
                        const uniqueSentences: string[] = [];
                        const seen = new Set<string>();
                        
                        // Normalize function: remove spaces and punctuation for comparison
                        // This makes "Hithere" and "Hi there" identical for duplicate detection
                        const normalizeForComparison = (s: string): string => {
                          return s.toLowerCase()
                            .replace(/\s+/g, '')  // Remove all spaces
                            .replace(/[.!?,:;'"-]/g, '')  // Remove punctuation
                            .trim();
                        };
                        
                        for (const sentence of sentences) {
                          const normalized = normalizeForComparison(sentence);
                          let isDuplicate = false;
                          
                          for (const seenNormalized of seen) {
                            // If normalized versions are identical, consider duplicate
                            if (normalized === seenNormalized) {
                              isDuplicate = true;
                              break;
                            }
                            // Check if one contains the other (for partial duplicates)
                            const shorter = normalized.length < seenNormalized.length ? normalized : seenNormalized;
                            const longer = normalized.length < seenNormalized.length ? seenNormalized : normalized;
                            if (shorter.length > 10 && longer.includes(shorter)) {
                              // If shorter is >80% of longer, consider duplicate
                              if (shorter.length / longer.length > 0.8) {
                                isDuplicate = true;
                                break;
                              }
                            }
                          }
                          
                          if (!isDuplicate) {
                            uniqueSentences.push(sentence);
                            seen.add(normalized);
                          }
                        }
                        return uniqueSentences.join(' ').trim();
                      };
                      
                      return {
                        ...msg,
                        content: cleanFinalMessage(msg.content || ''),
                        isStreaming: false
                      };
                    }
                    return msg;
                  })
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
      const response = await fetch('/api/research', {
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
                    prev.map((msg) => {
                      if (msg.id === assistantMessageId) {
                        // Clean final message to remove duplicates
                        const cleanFinalMessage = (text: string): string => {
                          if (!text) return text;
                          const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 0);
                          const uniqueSentences: string[] = [];
                          const seen = new Set<string>();
                          
                          // Normalize function: remove spaces and punctuation for comparison
                          // This makes "Hithere" and "Hi there" identical for duplicate detection
                          const normalizeForComparison = (s: string): string => {
                            return s.toLowerCase()
                              .replace(/\s+/g, '')  // Remove all spaces
                              .replace(/[.!?,:;'"-]/g, '')  // Remove punctuation
                              .trim();
                          };
                          
                          for (const sentence of sentences) {
                            const normalized = normalizeForComparison(sentence);
                            let isDuplicate = false;
                            
                            for (const seenNormalized of seen) {
                              // If normalized versions are identical, consider duplicate
                              if (normalized === seenNormalized) {
                                isDuplicate = true;
                                break;
                              }
                              // Check if one contains the other (for partial duplicates)
                              const shorter = normalized.length < seenNormalized.length ? normalized : seenNormalized;
                              const longer = normalized.length < seenNormalized.length ? seenNormalized : normalized;
                              if (shorter.length > 10 && longer.includes(shorter)) {
                                // If shorter is >80% of longer, consider duplicate
                                if (shorter.length / longer.length > 0.8) {
                                  isDuplicate = true;
                                  break;
                                }
                              }
                            }
                            
                            if (!isDuplicate) {
                              uniqueSentences.push(sentence);
                              seen.add(normalized);
                            }
                          }
                          return uniqueSentences.join(' ').trim();
                        };
                        
                        return {
                          ...msg,
                          content: cleanFinalMessage(msg.content || ''),
                          isStreaming: false
                        };
                      }
                      return msg;
                    })
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
    
    // Helper to clean task prompt echoes (simple, for streaming chunks)
    const cleanAgentResponse = (text: string): string => {
      if (!text) return text;
      
      // Remove the task prompt if the agent echoed it back
      const promptPatterns = [
        /^You are a friendly AI research assistant.*?Only provide.*?$/s,
        /^You are a friendly AI research assistant.*?Do NOT.*?$/s,
        /^The user said:.*?"/s,
      ];
      
      for (const pattern of promptPatterns) {
        text = text.replace(pattern, '');
      }
      
      // Remove trailing instruction echoes (but don't split sentences)
      text = text.replace(/Do NOT use.*?$/s, '');
      text = text.replace(/Only provide.*?$/s, '');
      text = text.replace(/Respond.*?sentences.*?$/s, '');
      
      // Fix periods in the middle of words (e.g., "here.to" -> "here to" or "here. to")
      // This happens when streaming breaks text incorrectly
      text = text.replace(/([a-z])\.([a-z])/gi, '$1 $2');
      // Fix merged words: lowercase letter followed by uppercase letter (e.g., "yourAI" -> "your AI")
      text = text.replace(/([a-z])([A-Z])/g, '$1 $2');
      // Fix merged words: uppercase letter followed by lowercase (e.g., "Hithere" -> "Hi there")
      text = text.replace(/([A-Z][a-z]+)([a-z]{2,})/g, (match, p1, p2) => {
        // If the second part looks like a word (starts with lowercase, 2+ chars), add space
        if (p2.length >= 2 && /^[a-z]/.test(p2)) {
          return p1 + ' ' + p2;
        }
        return match;
      });
      
      return text.trim();
    };
    
    // Clean final message to remove duplicates (only for complete messages)
    const cleanFinalMessage = (text: string): string => {
      if (!text) return text;
      
      // First basic cleaning
      text = cleanAgentResponse(text);
      
      // Fix any remaining formatting issues
      // Fix periods in middle of words
      text = text.replace(/([a-z])\.([a-z])/gi, '$1 $2');
      // Fix merged words: lowercase letter followed by uppercase letter (e.g., "yourAI" -> "your AI")
      text = text.replace(/([a-z])([A-Z])/g, '$1 $2');
      // Fix merged words: uppercase word followed by lowercase word (e.g., "Hithere" -> "Hi there")
      text = text.replace(/([A-Z][a-z]+)([a-z]{2,})/g, (match, p1, p2) => {
        // Common short words that might be merged
        const commonWords = ['there', 'here', 'with', 'your', 'any', 'can', 'the', 'and', 'for', 'are', 'was', 'has', 'had', 'not', 'but', 'you', 'all', 'how', 'what', 'when', 'where', 'this', 'that', 'from', 'have', 'will', 'would', 'could', 'should'];
        if (commonWords.includes(p2.toLowerCase()) || p2.length >= 3) {
          return p1 + ' ' + p2;
        }
        return match;
      });
      // Fix merged words: lowercase word followed by lowercase word (e.g., "withany" -> "with any")
      // This is trickier - we'll use common word patterns
      const commonWordPatterns = [
        /(with)(any|your|the|a|an|this|that|these|those)/gi,
        /(how)(can|could|should|will|would|do|did|does|is|are|was|were)/gi,
        /(what)(is|are|was|were|do|did|does|can|could|should|will|would)/gi,
        /(when)(is|are|was|were|do|did|does|can|could|should|will|would)/gi,
        /(where)(is|are|was|were|do|did|does|can|could|should|will|would)/gi,
        /(there)(is|are|was|were|will|would)/gi,
        /(here)(is|are|was|were|will|would)/gi,
        /(your)(coding|programming|code|project|work|task|question|issue|problem)/gi,
        /(any)(programming|coding|code|task|question|issue|problem|help|assistance)/gi,
      ];
      for (const pattern of commonWordPatterns) {
        text = text.replace(pattern, '$1 $2');
      }
      // More general: catch common merged word patterns
      // Fix "Hithere", "Howcan", etc. (capitalized word + lowercase word)
      text = text.replace(/([A-Z][a-z]{1,2})([a-z]{2,})/g, (match, p1, p2) => {
        const commonWords = ['there', 'here', 'can', 'will', 'would', 'could', 'should', 'have', 'with', 'your', 'any', 'the', 'and', 'for', 'are', 'was', 'has', 'had', 'not', 'but', 'you', 'all', 'how', 'what', 'when', 'where', 'this', 'that', 'from'];
        if (commonWords.includes(p2.toLowerCase())) {
          return p1 + ' ' + p2;
        }
        return match;
      });
      // Fix lowercase-to-lowercase merges like "withany", "withyour", "codingassistant"
      text = text.replace(/([a-z]{2,})([a-z]{3,})/g, (match, p1, p2) => {
        const word1 = p1.toLowerCase();
        const word2 = p2.toLowerCase();
        // Common first words
        const commonFirst = ['with', 'your', 'any', 'the', 'and', 'for', 'are', 'was', 'has', 'had', 'not', 'but', 'you', 'all', 'how', 'what', 'when', 'where', 'this', 'that', 'from', 'have', 'will', 'would', 'could', 'should', 'there', 'here', 'can'];
        // Common second words
        const commonSecond = ['any', 'your', 'the', 'and', 'for', 'are', 'was', 'has', 'had', 'not', 'but', 'you', 'all', 'how', 'what', 'when', 'where', 'this', 'that', 'from', 'have', 'will', 'would', 'could', 'should', 'there', 'here', 'can', 'coding', 'programming', 'assistant', 'tasks', 'questions', 'today'];
        // Common word endings that suggest word boundary
        const commonEndings = ['ing', 'ed', 'er', 'ly', 'tion', 'sion', 'ment', 'ness', 'ful', 'less', 'ist', 'ism'];
        
        if (commonFirst.includes(word1) || commonSecond.includes(word2) || 
            commonEndings.some(ending => word1.endsWith(ending))) {
          return p1 + ' ' + p2;
        }
        return match;
      });
      // Normalize multiple spaces
      text = text.replace(/\s+/g, ' ');
      // Fix spacing around punctuation
      text = text.replace(/\s+([.!?,])/g, '$1');
      text = text.replace(/([.!?])\s*([a-z])/gi, '$1 $2');
      
      // Remove duplicate content - split by sentence boundaries carefully
      const sentences = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 0);
      const uniqueSentences: string[] = [];
      const seen = new Set<string>();
      
      // Normalize function: remove spaces and punctuation for comparison
      // This makes "Hithere" and "Hi there" identical for duplicate detection
      const normalizeForComparison = (s: string): string => {
        return s.toLowerCase()
          .replace(/\s+/g, '')  // Remove all spaces
          .replace(/[.!?,:;'"-]/g, '')  // Remove punctuation
          .trim();
      };
      
      for (const sentence of sentences) {
        const normalized = normalizeForComparison(sentence);
        let isDuplicate = false;
        
        for (const seenNormalized of seen) {
          // If normalized versions are identical, consider duplicate
          if (normalized === seenNormalized) {
            isDuplicate = true;
            break;
          }
          // Check if one contains the other (for partial duplicates)
          const shorter = normalized.length < seenNormalized.length ? normalized : seenNormalized;
          const longer = normalized.length < seenNormalized.length ? seenNormalized : normalized;
          if (shorter.length > 10 && longer.includes(shorter)) {
            // If shorter is >80% of longer, consider duplicate
            if (shorter.length / longer.length > 0.8) {
              isDuplicate = true;
              break;
            }
          }
        }
        
        if (!isDuplicate) {
          uniqueSentences.push(sentence);
          seen.add(normalized);
        }
      }
      
      // Rejoin with single space and ensure proper punctuation spacing
      let result = uniqueSentences.join(' ').trim();
      // Final cleanup: ensure space after periods
      result = result.replace(/([.!?])([a-z])/gi, '$1 $2');
      return result;
    };
    
    // Helper to recursively find text in nested objects
    const findTextInObject = (obj: any, depth = 0): string => {
      if (depth > 3) return ''; // Limit recursion depth
      if (!obj || typeof obj !== 'object') return '';
      
      // Check direct text fields
      if (typeof obj.text === 'string' && obj.text.trim()) return cleanAgentResponse(obj.text);
      if (typeof obj.content === 'string' && obj.content.trim()) return cleanAgentResponse(obj.content);
      if (typeof obj.message === 'string' && obj.message.trim()) return cleanAgentResponse(obj.message);
      
      // Check content arrays
      if (Array.isArray(obj.content)) {
        const textParts = obj.content
          .filter((item: any) => item && item.type === 'text' && typeof item.text === 'string')
          .map((item: any) => item.text);
        if (textParts.length > 0) return cleanAgentResponse(textParts.join(''));
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
      return cleanAgentResponse(data.text);
    }
    
    if (typeof data.content === 'string' && data.content.trim()) {
      return cleanAgentResponse(data.content);
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
          return cleanAgentResponse(textParts.join(''));
        }
      } else if (msgObj.content && typeof msgObj.content === 'string') {
        return cleanAgentResponse(msgObj.content);
      } else if (msgObj.text && typeof msgObj.text === 'string') {
        return cleanAgentResponse(msgObj.text);
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
        message += cleanAgentResponse(data.message.text);
      } else if (data.message && typeof data.message === 'string') {
        message += cleanAgentResponse(data.message);
      }
    } else if (data.type === 'task_complete' || data.type === 'task_result') {
      message += `\n✅ Task Complete\n`;
      if (data.result) {
        message += cleanAgentResponse(data.result);
      } else if (data.content) {
        message += cleanAgentResponse(data.content);
      }
    } else {
      // For other events, try to extract any text content
      if (data.message && typeof data.message === 'string') {
        message += cleanAgentResponse(data.message);
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
      // Normalize function: remove spaces and punctuation for comparison
      // This makes "Hithere" and "Hi there" identical for duplicate detection
      const normalizeForComparison = (s: string): string => {
        return s.toLowerCase()
          .replace(/\s+/g, '')  // Remove all spaces
          .replace(/[.!?,:;'"-]/g, '')  // Remove punctuation
          .trim();
      };
      
      // Clean both contents before comparison
      const cleanedCurrent = currentContent.trim();
      let cleanedNew = newContent.trim();
      
      // Normalize both for duplicate detection
      const normalizedCurrent = normalizeForComparison(cleanedCurrent);
      const normalizedNew = normalizeForComparison(cleanedNew);
      
      // Skip if normalized versions are identical (duplicate)
      if (normalizedCurrent === normalizedNew) {
        return currentContent; // Keep the existing version
      }
      
      // Check if normalized new is contained in normalized current (duplicate)
      if (normalizedCurrent.includes(normalizedNew) && normalizedNew.length > 10) {
        // If new content is >80% of current content, it's likely a duplicate
        if (normalizedNew.length / normalizedCurrent.length > 0.8) {
          return currentContent;
        }
      }
      
      // Check if normalized current is contained in normalized new (replacement with better formatting)
      if (normalizedNew.includes(normalizedCurrent) && normalizedCurrent.length > 10) {
        // If current is >80% of new, new is likely a better-formatted version
        if (normalizedCurrent.length / normalizedNew.length > 0.8) {
          // Use the new version if it has better spacing (more spaces = better formatted)
          if (cleanedNew.split(/\s+/).length > cleanedCurrent.split(/\s+/).length) {
            return newContent; // Replace with better formatted version
          }
        }
      }
      
      // For streaming text, always add space between chunks to prevent word concatenation
      // But first, fix any merged words in the new content before adding
      let fixedNewContent = cleanedNew;
      
      // Fix merged words in new content during streaming
      // Fix periods in middle of words
      fixedNewContent = fixedNewContent.replace(/([a-z])\.([a-z])/gi, '$1 $2');
      // Fix merged words: lowercase letter followed by uppercase letter
      fixedNewContent = fixedNewContent.replace(/([a-z])([A-Z])/g, '$1 $2');
      // Fix merged words: uppercase word followed by lowercase word
      fixedNewContent = fixedNewContent.replace(/([A-Z][a-z]{1,2})([a-z]{2,})/g, (match, p1, p2) => {
        const commonWords = ['there', 'here', 'can', 'will', 'would', 'could', 'should', 'have', 'with', 'your', 'any', 'the', 'and', 'for', 'are', 'was', 'has', 'had', 'not', 'but', 'you', 'all', 'how', 'what', 'when', 'where', 'this', 'that', 'from', 'with', 'deep', 'about'];
        if (commonWords.includes(p2.toLowerCase()) || p2.length >= 3) {
          return p1 + ' ' + p2;
        }
        return match;
      });
      // Fix lowercase-to-lowercase merges
      fixedNewContent = fixedNewContent.replace(/([a-z]{2,})([a-z]{3,})/g, (match, p1, p2) => {
        const word1 = p1.toLowerCase();
        const word2 = p2.toLowerCase();
        const commonFirst = ['with', 'your', 'any', 'the', 'and', 'for', 'are', 'was', 'has', 'had', 'not', 'but', 'you', 'all', 'how', 'what', 'when', 'where', 'this', 'that', 'from', 'have', 'will', 'would', 'could', 'should', 'there', 'here', 'can', 'help', 'diving', 'curious'];
        const commonSecond = ['any', 'your', 'the', 'and', 'for', 'are', 'was', 'has', 'had', 'not', 'but', 'you', 'all', 'how', 'what', 'when', 'where', 'this', 'that', 'from', 'have', 'will', 'would', 'could', 'should', 'there', 'here', 'can', 'research', 'need', 'online', 'data', 'deep', 'into', 'topics', 'about', 'today', 'would'];
        const commonEndings = ['ing', 'ed', 'er', 'ly', 'tion', 'sion', 'ment', 'ness', 'ful', 'less', 'ist', 'ism'];
        
        if (commonFirst.includes(word1) || commonSecond.includes(word2) || 
            commonEndings.some(ending => word1.endsWith(ending))) {
          return p1 + ' ' + p2;
        }
        return match;
      });
      
      // Now check again with fixed content for duplicates
      const fixedNormalizedNew = normalizeForComparison(fixedNewContent);
      if (normalizedCurrent === fixedNormalizedNew) {
        return currentContent; // Duplicate after fixing
      }
      
      // Use the fixed version
      cleanedNew = fixedNewContent;
      // Normalize spacing: trim both sides and add a single space
      const trimmedCurrent = currentContent.trimEnd();
      const trimmedNew = cleanedNew.trimStart();
      
      // Check if we should skip adding space (punctuation that should attach directly)
      const currentEndsWithPunctuation = /[.!?,:;]$/.test(trimmedCurrent);
      const newStartsWithPunctuation = /^[.!?,:;]/.test(trimmedNew);
      
      // If current ends with punctuation and new starts with punctuation, attach directly
      if (currentEndsWithPunctuation && newStartsWithPunctuation) {
        return trimmedCurrent + trimmedNew;
      }
      
      // If current ends with opening punctuation (like '(' or '['), attach directly
      if (/[(\[{]$/.test(trimmedCurrent)) {
        return trimmedCurrent + trimmedNew;
      }
      
      // If new starts with closing punctuation (like ')' or ']'), attach directly
      if (/^[)\]}]/.test(trimmedNew)) {
        return trimmedCurrent + trimmedNew;
      }
      
      // For all other cases, always add a space between chunks
      // This ensures consistent spacing and prevents word merging
      return trimmedCurrent + ' ' + trimmedNew;
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
    <div className="glass rounded-xl shadow-lg w-full h-full flex flex-col overflow-hidden">
      {/* Connection Status Bar - Top */}
      <div className="flex-shrink-0 px-4 py-2 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)', background: 'rgba(0, 0, 0, 0.2)' }}>
        <div className="flex items-center gap-3">
          <span className="text-xs text-secondary font-medium uppercase tracking-wider">Connection</span>
          <button
            type="button"
            onClick={() => setUseWebSocket(!useWebSocket)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
              useWebSocket
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
            }`}
          >
            {useWebSocket ? 'WebSocket' : 'SSE'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          {useWebSocket && wsRef.current ? (
            <span className={`flex items-center gap-1.5 text-xs font-medium ${wsRef.current.readyState === WebSocket.OPEN ? 'text-emerald-400' : 'text-red-400'}`}>
              <span className={`w-2 h-2 rounded-full ${wsRef.current.readyState === WebSocket.OPEN ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
              {wsRef.current.readyState === WebSocket.OPEN ? 'Connected' : 'Disconnected'}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <span className="w-2 h-2 rounded-full bg-gray-500"></span>
              Not Connected
            </span>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
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
      <div className="flex-shrink-0 border-t p-4 glass" style={{ borderColor: 'var(--border-color)' }}>
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

