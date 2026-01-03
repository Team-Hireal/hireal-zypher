import {
  AnthropicModelProvider,
  createZypherContext,
  ZypherAgent,
} from "@zypher/agent";
import { eachValueFrom } from "rxjs-for-await";
import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

// Load environment variables from .env file if it exists (for local development)
async function loadEnvFile(): Promise<void> {
  try {
    const envPath = join(process.cwd(), ".env");
    const envFile = await readFile(envPath, "utf-8");
    for (const line of envFile.split("\n")) {
      const trimmedLine = line.trim();
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith("#")) continue;
      
      const [key, ...valueParts] = trimmedLine.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=").trim();
        // Only set if not already set (environment variables take precedence)
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value;
        }
      }
    }
  } catch (error: any) {
    // .env file doesn't exist or can't be read - that's okay
    if (error.code !== "ENOENT") {
      console.warn("Warning: Could not load .env file:", error.message);
    }
  }
}

// Helper function to safely get environment variables
function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Environment variable ${name} is not set or is empty.\n` +
      `Please check your .env file or environment variables.\n` +
      `For Anthropic API key, get one at: https://console.anthropic.com/`
    );
  }
  
  // Validate Anthropic API key format
  if (name === "ANTHROPIC_API_KEY") {
    const trimmedValue = value.trim();
    if (!trimmedValue.startsWith("sk-ant-")) {
      console.warn(
        `⚠️  Warning: ANTHROPIC_API_KEY doesn't start with "sk-ant-". ` +
        `This might indicate an invalid key format.`
      );
    }
    if (trimmedValue.length < 20) {
      throw new Error(
        `ANTHROPIC_API_KEY appears to be invalid (too short). ` +
        `Please verify your API key at: https://console.anthropic.com/`
      );
    }
    return trimmedValue;
  }
  
  return value.trim();
}

// Initialize agent (singleton pattern)
let agentInstance: ZypherAgent | null = null;

async function getAgent(): Promise<ZypherAgent> {
  if (agentInstance) {
    return agentInstance;
  }

  // Load .env file before proceeding (for local development)
  await loadEnvFile();

  // Validate API keys before proceeding
  const anthropicKey = getRequiredEnv("ANTHROPIC_API_KEY");
  const firecrawlKey = getRequiredEnv("FIRECRAWL_API_KEY");

  try {
    // Initialize the agent execution context
    const zypherContext = await createZypherContext(process.cwd());

    // Create the agent with your preferred LLM provider
    const agent = new ZypherAgent(
      zypherContext,
      new AnthropicModelProvider({
        apiKey: anthropicKey,
      }),
    );

    // Register and connect to an MCP server to give the agent web crawling capabilities
    await agent.mcp.registerServer({
      id: "firecrawl",
      type: "command",
      command: {
        command: "npx",
        args: ["-y", "firecrawl-mcp"],
        env: {
          FIRECRAWL_API_KEY: firecrawlKey,
        },
      },
    });

    agentInstance = agent;
    return agent;
  } catch (error) {
    // Provide helpful error messages for authentication failures
    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes("authentication") || errorMsg.includes("api-key") || errorMsg.includes("401")) {
        throw new Error(
          `❌ Authentication failed: Invalid ANTHROPIC_API_KEY\n\n` +
          `Please verify your API key:\n` +
          `1. Check your .env file has: ANTHROPIC_API_KEY=sk-ant-...\n` +
          `2. Get a valid key at: https://console.anthropic.com/\n` +
          `3. Ensure the key is not expired or revoked\n\n` +
          `Original error: ${error.message}`
        );
      }
    }
    throw error;
  }
}

// Check if query is asking to research a specific person
function isResearchQuery(query: string): boolean {
  const trimmedQuery = query.trim();
  const lowerQuery = trimmedQuery.toLowerCase();
  
  // Simple greetings and casual conversation - NOT research
  const simplePatterns = [
    /^(hi|hello|hey|greetings|good morning|good afternoon|good evening)$/i,
    /^(thanks|thank you|thx)$/i,
    /^(yes|no|ok|okay|sure|alright)$/i,
    /^(how are you|what's up|how's it going)$/i,
    /^(help|what can you do|what do you do)$/i,
    /^(who are you|what are you)$/i,
  ];
  
  // If it matches simple patterns, it's not a research query
  if (simplePatterns.some(pattern => pattern.test(trimmedQuery))) {
    return false;
  }
  
  // Questions about capabilities or general questions - NOT research (unless they contain a name)
  const generalQuestionPatterns = [
    /^(what|how|why|when|where|can you|do you|are you)/i,
    /^(explain|describe|what is|what are)/i,
  ];
  
  // Check if it's a general question first
  const isGeneralQuestion = generalQuestionPatterns.some(pattern => pattern.test(trimmedQuery));
  
  // Look for person name patterns (capitalized words that look like names)
  // Pattern 1: Contains "research [name]", "find [name]", "search [name]", "about [name]", etc.
  const researchIntentPattern = /(?:research|find|search|look up|information about|tell me about|who is|who was)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i;
  const researchMatch = researchIntentPattern.exec(trimmedQuery);
  if (researchMatch) {
    // Found research intent with a name
    return true;
  }
  
  // Pattern 2: Query is just a name (2-4 capitalized words, possibly with middle name/initial)
  // Examples: "John Smith", "Mary Jane Watson", "J. K. Rowling"
  const nameOnlyPattern = /^[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+){1,3}$/;
  if (nameOnlyPattern.test(trimmedQuery)) {
    return true;
  }
  
  // Pattern 3: Check if query contains what looks like a person name (2+ consecutive capitalized words)
  // This handles cases like "Tell me about John Smith" or "What do you know about Mary Jane?"
  const words = trimmedQuery.split(/\s+/);
  let consecutiveCapitalized = 0;
  let foundName = false;
  
  for (const word of words) {
    // Match capitalized words (names) or initials like "J." or "K."
    if (/^[A-Z][a-z]+$/.test(word) || /^[A-Z]\.$/.test(word)) {
      consecutiveCapitalized++;
      if (consecutiveCapitalized >= 2) {
        // Found a potential name (2+ consecutive capitalized words)
        foundName = true;
        break;
      }
    } else {
      consecutiveCapitalized = 0;
    }
  }
  
  // If we found a name in a general question, it's a research query
  if (foundName && isGeneralQuestion) {
    return true;
  }
  
  // If we found a name and it's not a general question, check if query is short (likely just a name)
  if (foundName && words.length <= 5) {
    return true;
  }
  
  // If it's a general question without a name, it's NOT research
  if (isGeneralQuestion) {
    return false;
  }
  
  // If it's very short (1-2 words) and doesn't look like a name, probably not research
  if (words.length <= 2 && !/[A-Z][a-z]+ [A-Z]/.test(trimmedQuery)) {
    return false;
  }
  
  // Default: if we can't determine, assume it's NOT a research query
  // This is safer - we only do research when we're confident it's a person name
  return false;
}

// Simple conversation response
function createSimpleConversationTask(query: string): string {
  return `You are a friendly AI research assistant. The user said: "${query}". Respond in 1-2 short sentences. Be warm and helpful. For greetings, greet back and mention you help research people. Do NOT use tools. Only provide your response - no instructions or prompts.`;
}

// Person information gathering task with self-autonomy
function createPersonResearchTask(personName: string): string {
  return `Research and gather comprehensive information about ${personName}. 

You must autonomously search for and verify the following information:

1. **Name**: Full name and any known aliases or variations
2. **Age**: Current age or date of birth (if available)
3. **Gender**: If mentioned or inferable
4. **Location**: Current location, city, state, country
5. **Professional History**: 
   - Current and past job positions
   - Companies worked for
   - Professional achievements
   - Industry expertise
6. **Educational History**:
   - Universities or schools attended
   - Degrees obtained
   - Academic achievements
7. **Other Fun Facts**: 
   - Personality traits
   - Interests and hobbies
   - Notable achievements or recognition
   - Social media presence

**Verification Requirements**:
- Cross-reference information from multiple sources
- Verify if the information makes logical sense (e.g., age matches career timeline)
- Flag any inconsistencies or unverified claims

**Alternative Search Methods**:
- If direct search doesn't yield results, try:
  - Finding LinkedIn profile through company websites
  - Searching professional directories
  - Checking university alumni pages
  - Looking for social media profiles
  - Searching news articles or press releases

**Web Search Instructions** (ONLY for research queries):
- Use web search and crawling tools to find information across multiple sources
- When using Firecrawl tools:
  - For search tools: Provide search queries as simple strings
  - For scraping tools: Use URLs directly to scrape specific pages
  - If a tool returns a parameter error, try a different approach or tool
- Visit and analyze the content of relevant websites
- Extract and verify information from multiple sources
- If web crawling tools fail, use alternative methods like manual URL construction or different search strategies

**IMPORTANT**: For simple conversations (greetings, questions about your capabilities), respond directly without using any tools. Only use web search tools when actually researching a person.

**Output Format**: 
Provide a structured JSON response with all found information, verification status for each field, and sources used. If information cannot be found, indicate "Not found" with the search methods attempted.

Begin your autonomous research now.`;
}

// Helper function to clean response by removing task prompt echoes
function cleanAgentResponse(text: string): string {
  if (!text) return text;
  
  // Remove the task prompt if the agent echoed it back
  const promptPatterns = [
    /^You are a friendly AI research assistant.*?Only provide your response.*?$/s,
    /^You are a friendly AI research assistant.*?Do NOT use tools.*?$/s,
    /^The user said:.*?"/s,
  ];
  
  for (const pattern of promptPatterns) {
    text = text.replace(pattern, '');
  }
  
  // Remove trailing instruction echoes (but don't split sentences)
  text = text.replace(/Do NOT use.*?$/s, '');
  text = text.replace(/Only provide.*?$/s, '');
  text = text.replace(/Respond.*?sentences.*?$/s, '');
  
  // Fix periods in the middle of words (e.g., "here.to" -> "here to")
  // This happens when streaming breaks text incorrectly
  text = text.replace(/([a-z])\.([a-z])/gi, '$1 $2');
  // Fix merged words: lowercase letter followed by uppercase letter (e.g., "yourAI" -> "your AI")
  text = text.replace(/([a-z])([A-Z])/g, '$1 $2');
  // Fix merged words: uppercase word followed by lowercase word (e.g., "Hithere" -> "Hi there")
  text = text.replace(/([A-Z][a-z]+)([a-z]{2,})/g, (match, p1, p2) => {
    const commonWords = ['there', 'here', 'with', 'your', 'any', 'can', 'the', 'and', 'for', 'are', 'was', 'has', 'had', 'not', 'but', 'you', 'all', 'how', 'what', 'when', 'where', 'this', 'that', 'from', 'have', 'will', 'would', 'could', 'should'];
    if (commonWords.includes(p2.toLowerCase()) || p2.length >= 3) {
      return p1 + ' ' + p2;
    }
    return match;
  });
  
  return text.trim();
}

// Helper function to extract message content from events
function extractMessageFromEvent(event: any): { text: string; status?: string } {
  let text = '';
  let status: string | undefined = undefined;
  
  // Extract text content
  if (typeof event.text === 'string' && event.text.trim()) {
    text = event.text;
  } else if (typeof event.content === 'string' && event.content.trim()) {
    text = event.content;
  } else if (event.message && typeof event.message === 'object') {
    if (Array.isArray(event.message.content)) {
      const textParts = event.message.content
        .filter((item: any) => item && item.type === 'text' && typeof item.text === 'string')
        .map((item: any) => item.text);
      text = textParts.join('');
    } else if (typeof event.message.content === 'string') {
      text = event.message.content;
    } else if (typeof event.message.text === 'string') {
      text = event.message.text;
    }
  } else if (event.message && typeof event.message === 'string') {
    text = event.message;
  }
  
  // Clean the response to remove any echoed task prompts
  text = cleanAgentResponse(text);
  
  // Get status for tool calls
  if (event.type === 'tool_call' || event.type === 'tool_result') {
    if (event.type === 'tool_call') {
      const toolName = event.tool_name || 'unknown';
      if (toolName.includes('search') || toolName.includes('firecrawl')) {
        status = 'Searching the web...';
      } else if (toolName.includes('scrape') || toolName.includes('crawl')) {
        status = 'Analyzing web pages...';
      } else {
        status = `Using ${toolName}...`;
      }
    } else if (event.type === 'tool_result') {
      status = 'Processing results...';
    }
  } else if (event.type === 'message' || event.type === 'text') {
    status = 'Thinking...';
  } else if (event.type === 'task_complete') {
    status = 'Complete';
  }
  
  return { text, status };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { personName } = body;

    if (!personName || typeof personName !== "string") {
      return new Response(
        JSON.stringify({ error: "personName is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const agent = await getAgent();
    
    // Determine if this is a research query or simple conversation
    const isResearch = isResearchQuery(personName);
    const task = isResearch 
      ? createPersonResearchTask(personName)
      : createSimpleConversationTask(personName);
    
    console.log(`[Request] Query: "${personName}" | Type: ${isResearch ? 'Research' : 'Conversation'}`);
    
    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        let lastActivity = Date.now();
        const keepAliveInterval = 30000; // 30 seconds
        let streamClosed = false;
        
        // Safe enqueue helper
        const safeEnqueue = (data: string) => {
          if (!streamClosed) {
            try {
              controller.enqueue(new TextEncoder().encode(data));
              lastActivity = Date.now();
            } catch (e) {
              console.warn('[Stream] Failed to enqueue, stream may be closed');
              streamClosed = true;
            }
          }
        };
        
        // Safe close helper
        const safeClose = () => {
          if (!streamClosed) {
            try {
              controller.close();
              streamClosed = true;
            } catch (e) {
              // Already closed
            }
          }
        };
        
        // Send keepalive messages to prevent connection suspension
        const keepAliveTimer = setInterval(() => {
          if (streamClosed) {
            clearInterval(keepAliveTimer);
            return;
          }
          const timeSinceLastActivity = Date.now() - lastActivity;
          if (timeSinceLastActivity >= keepAliveInterval - 5000) {
            // Only send keepalive if we haven't sent data recently
            safeEnqueue(`: keepalive\n\n`);
          }
        }, 10000); // Check every 10 seconds
        
        // Declare timeout variables in outer scope
        let overallTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
        let taskCompleted = false;
        const startTime = Date.now();
        const overallTimeout = isResearch ? 600000 : 30000; // 10 min for research, 30s for conversation
        
        try {
          // Overall timeout protection
          overallTimeoutTimer = setTimeout(() => {
            if (!taskCompleted && !streamClosed) {
              console.error(`[Overall Timeout] Task exceeded ${overallTimeout}ms timeout`);
              const timeoutData = JSON.stringify({
                type: 'fatal_timeout',
                message: `Task exceeded maximum time limit of ${Math.round(overallTimeout / 1000)}s`,
                timestamp: Date.now()
              });
              safeEnqueue(`data: ${timeoutData}\n\n`);
              safeClose();
            }
          }, overallTimeout);
          
          const event$ = agent.runTask(task, "claude-sonnet-4-20250514");
          
          let eventCount = 0;
          let lastEventTime = Date.now();
          const eventTimeout = isResearch ? 120000 : 10000; // 2 min for research, 10s for conversation
          
          // Timeout check
          const timeoutCheck = setInterval(() => {
            if (streamClosed) {
              clearInterval(timeoutCheck);
              return;
            }
            const timeSinceLastEvent = Date.now() - lastEventTime;
            if (timeSinceLastEvent > eventTimeout) {
              console.error(`[Agent Timeout] No events received for ${timeSinceLastEvent}ms`);
              const timeoutData = JSON.stringify({
                type: 'timeout_warning',
                message: `Agent appears stuck - no events for ${Math.round(timeSinceLastEvent / 1000)}s`,
                timestamp: Date.now()
              });
              safeEnqueue(`data: ${timeoutData}\n\n`);
            }
          }, 10000); // Check every 10 seconds
          
          for await (const event of eachValueFrom(event$)) {
            lastActivity = Date.now();
            lastEventTime = Date.now();
            eventCount++;
            
            // Type guard for event
            const eventAny = event as any;
            
            // Detailed logging for all events
            const eventType = eventAny?.type || 'unknown';
            
            // Log the actual event structure for debugging
            console.log(`[Event #${eventCount}] Type: ${eventType}`);
            
            // Filter out non-fatal MCP tool errors - they're logged but don't stop execution
            if (eventAny?.type === 'tool_error' || eventAny?.type === 'error') {
              const eventStr = JSON.stringify(eventAny);
              const errorMsg = (eventAny?.message || eventAny?.error || eventStr || '').toLowerCase();
              
              // Check for authentication errors - these are FATAL and should stop execution
              if (errorMsg.includes('authentication') || 
                  errorMsg.includes('api-key') || 
                  errorMsg.includes('invalid x-api-key') ||
                  errorMsg.includes('401') ||
                  (errorMsg.includes('status') && errorMsg.includes('401'))) {
                console.error(`[FATAL] Authentication error detected:`, eventAny);
                const authError = JSON.stringify({
                  type: 'fatal_authentication_error',
                  message: 
                    `❌ Authentication Error: Invalid API Key\n\n` +
                    `Your ANTHROPIC_API_KEY appears to be invalid or expired.\n` +
                    `Please:\n` +
                    `1. Check your .env file has a valid key\n` +
                    `2. Get a new key at: https://console.anthropic.com/\n` +
                    `3. Restart the server after updating the key\n\n` +
                    `Original error: ${eventAny?.message || eventAny?.error || 'Authentication failed'}`,
                  timestamp: Date.now()
                });
                safeEnqueue(`data: ${authError}\n\n`);
                taskCompleted = true;
                safeClose();
                break;
              }
              
              // Check if it's a Firecrawl parameter validation error (non-fatal)
              if (eventStr.includes('parameter validation failed') || 
                  eventStr.includes('McpError') ||
                  eventStr.includes('firecrawl_search')) {
                console.warn(`[Non-fatal Error] ${eventAny?.type} - agent will retry`);
                // Still send a notification to frontend
                const errorNotification = JSON.stringify({
                  type: 'tool_error_retry',
                  message: 'Tool error occurred, trying alternative method...',
                  tool: eventAny?.tool_name || 'unknown',
                  timestamp: Date.now()
                });
                safeEnqueue(`data: ${errorNotification}\n\n`);
                continue;
              }
              // For other errors, still send them but mark as warnings
              const warningData = JSON.stringify({
                ...eventAny,
                warning: true,
                message: 'Tool error occurred, agent will attempt alternative methods'
              });
              safeEnqueue(`data: ${warningData}\n\n`);
              continue;
            }
            
            // Send all events to frontend with enhanced metadata
            const enhancedEvent = {
              ...eventAny,
              eventNumber: eventCount,
              timestamp: Date.now(),
            };
            
            const data = JSON.stringify(enhancedEvent);
            safeEnqueue(`data: ${data}\n\n`);
          }
          
          // Wait a bit to ensure all events are processed
          await new Promise(resolve => setTimeout(resolve, 100));
          
          clearInterval(timeoutCheck);
          if (overallTimeoutTimer) {
            clearTimeout(overallTimeoutTimer);
          }
          taskCompleted = true;
          const duration = Date.now() - startTime;
          console.log(`[Agent Complete] Finished processing ${eventCount} total events in ${Math.round(duration / 1000)}s`);
          
          // Send completion event
          const completionEvent = JSON.stringify({
            type: 'task_complete',
            message: 'Task completed successfully',
            eventCount,
            duration: Math.round(duration / 1000),
            timestamp: Date.now()
          });
          safeEnqueue(`data: ${completionEvent}\n\n`);
          
          // Wait a bit more before closing
          await new Promise(resolve => setTimeout(resolve, 200));
          
          clearInterval(keepAliveTimer);
          safeClose();
        } catch (error) {
          clearInterval(keepAliveTimer);
          if (overallTimeoutTimer) {
            clearTimeout(overallTimeoutTimer);
          }
          taskCompleted = true;
          console.error(`[Fatal Error]`, error);
          
          // Check for authentication errors
          let errorMessage = error instanceof Error ? error.message : "Unknown error";
          const errorStr = errorMessage.toLowerCase();
          
          if (errorStr.includes("authentication") || 
              errorStr.includes("api-key") || 
              errorStr.includes("invalid x-api-key") ||
              errorStr.includes("401")) {
            errorMessage = 
              `❌ Authentication Error: Invalid API Key\n\n` +
              `Your ANTHROPIC_API_KEY appears to be invalid or expired.\n` +
              `Please:\n` +
              `1. Check your .env file has a valid key\n` +
              `2. Get a new key at: https://console.anthropic.com/\n` +
              `3. Restart the server after updating the key\n\n` +
              `Original error: ${errorMessage}`;
          }
          
          const errorData = JSON.stringify({ 
            error: errorMessage,
            type: "fatal_error"
          });
          safeEnqueue(`data: ${errorData}\n\n`);
          safeClose();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    // Check for authentication errors
    let errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStr = errorMessage.toLowerCase();
    let statusCode = 500;
    
    if (errorStr.includes("authentication") || 
        errorStr.includes("api-key") || 
        errorStr.includes("invalid x-api-key") ||
        errorStr.includes("401") ||
        (errorStr.includes("environment variable") && errorStr.includes("not set"))) {
      statusCode = 401;
      if (errorStr.includes("not set") || errorStr.includes("empty")) {
        errorMessage = 
          `❌ Missing API Key\n\n` +
          `The ANTHROPIC_API_KEY environment variable is not set.\n` +
          `Please:\n` +
          `1. Create a .env file in the project root\n` +
          `2. Add: ANTHROPIC_API_KEY=sk-ant-your-key-here\n` +
          `3. Get a key at: https://console.anthropic.com/\n` +
          `4. Restart the server\n\n` +
          `Original error: ${errorMessage}`;
      } else {
        errorMessage = 
          `❌ Authentication Error: Invalid API Key\n\n` +
          `Your ANTHROPIC_API_KEY appears to be invalid or expired.\n` +
          `Please:\n` +
          `1. Check your .env file has a valid key\n` +
          `2. Get a new key at: https://console.anthropic.com/\n` +
          `3. Restart the server after updating the key\n\n` +
          `Original error: ${errorMessage}`;
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        type: statusCode === 401 ? "authentication_error" : "server_error"
      }),
      {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

