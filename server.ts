import {
  AnthropicModelProvider,
  createZypherContext,
  ZypherAgent,
} from "@zypher/agent";
import { eachValueFrom } from "rxjs-for-await";

// Load environment variables from .env file if it exists
async function loadEnvFile(): Promise<void> {
  try {
    const envFile = await Deno.readTextFile(".env");
    for (const line of envFile.split("\n")) {
      const trimmedLine = line.trim();
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith("#")) continue;
      
      const [key, ...valueParts] = trimmedLine.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=").trim();
        // Only set if not already set (environment variables take precedence)
        if (!Deno.env.get(key.trim())) {
          Deno.env.set(key.trim(), value);
        }
      }
    }
  } catch (error) {
    // .env file doesn't exist or can't be read - that's okay
    if (!(error instanceof Deno.errors.NotFound)) {
      console.warn("Warning: Could not load .env file:", error.message);
    }
  }
}

// Helper function to safely get environment variables
function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
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

  // Load .env file before proceeding
  await loadEnvFile();

  // Validate API keys before proceeding
  const anthropicKey = getRequiredEnv("ANTHROPIC_API_KEY");
  const firecrawlKey = getRequiredEnv("FIRECRAWL_API_KEY");

  try {
    // Initialize the agent execution context
    const zypherContext = await createZypherContext(Deno.cwd());

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

// Helper function to extract agent status from events
function getAgentStatus(event: any): string {
  if (event.type === 'tool_call') {
    const toolName = event.tool_name || 'unknown';
    // Map tool names to user-friendly status
    if (toolName.includes('search') || toolName.includes('firecrawl')) {
      return 'Searching the web...';
    } else if (toolName.includes('scrape') || toolName.includes('crawl')) {
      return 'Analyzing web pages...';
    } else {
      return `Using ${toolName}...`;
    }
  } else if (event.type === 'tool_result') {
    return 'Processing results...';
  } else if (event.type === 'message' || event.type === 'text') {
    return 'Thinking...';
  } else if (event.type === 'task_complete') {
    return 'Complete';
  }
  return 'Processing...';
}

// Helper function to clean response by removing task prompt echoes
// This should be called on streaming chunks - keep it simple, no sentence splitting
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

// Clean final message to remove duplicates (only call this on complete messages)
function cleanFinalMessage(text: string): string {
  if (!text) return text;
  
  // First, remove prompt echoes
  text = cleanAgentResponse(text);
  
  // Fix any remaining formatting issues
  // Fix periods in middle of words
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
  // Fix merged words: common patterns
  const commonWordPatterns = [
    /(with)(any|your|the|a|an|this|that|these|those)/gi,
    /(how)(can|could|should|will|would|do|did|does|is|are|was|were)/gi,
    /(what)(is|are|was|were|do|did|does|can|could|should|will|would)/gi,
    /(your)(coding|programming|code|project|work|task|question|issue|problem)/gi,
    /(any)(programming|coding|code|task|question|issue|problem|help|assistance)/gi,
  ];
  for (const pattern of commonWordPatterns) {
    text = text.replace(pattern, '$1 $2');
  }
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
    const commonFirst = ['with', 'your', 'any', 'the', 'and', 'for', 'are', 'was', 'has', 'had', 'not', 'but', 'you', 'all', 'how', 'what', 'when', 'where', 'this', 'that', 'from', 'have', 'will', 'would', 'could', 'should', 'there', 'here', 'can'];
    const commonSecond = ['any', 'your', 'the', 'and', 'for', 'are', 'was', 'has', 'had', 'not', 'but', 'you', 'all', 'how', 'what', 'when', 'where', 'this', 'that', 'from', 'have', 'will', 'would', 'could', 'should', 'there', 'here', 'can', 'coding', 'programming', 'assistant', 'tasks', 'questions', 'today'];
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
  
  // Remove duplicate content - split by sentence boundaries more carefully
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
    
    // Check for duplicates
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
  
  // Rejoin with proper spacing
  let result = uniqueSentences.join(' ').trim();
  // Final cleanup: ensure space after periods
  result = result.replace(/([.!?])([a-z])/gi, '$1 $2');
  return result;
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
    status = getAgentStatus(event);
  }
  
  return { text, status };
}

// HTTP Server
async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // WebSocket endpoint
  if (url.pathname === "/ws" && request.headers.get("upgrade") === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(request);
    
    socket.onopen = () => {
      console.log("[WebSocket] Client connected");
      socket.send(JSON.stringify({ type: "connected", message: "WebSocket connection established" }));
    };
    
    socket.onmessage = async (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "research" && data.personName) {
          const personName = data.personName;
          const agent = await getAgent();
          
          // Determine if this is a research query or simple conversation
          const isResearch = isResearchQuery(personName);
          const task = isResearch 
            ? createPersonResearchTask(personName)
            : createSimpleConversationTask(personName);
          
          console.log(`[WebSocket] Query: "${personName}" | Type: ${isResearch ? 'Research' : 'Conversation'}`);
          
          // Send initial status
          socket.send(JSON.stringify({
            type: "status",
            status: "initializing",
            message: isResearch ? "Starting research..." : "Processing your message..."
          }));
          
          try {
            const event$ = agent.runTask(task, "claude-sonnet-4-20250514");
            let eventCount = 0;
            let lastStatus = "initializing";
            
            for await (const agentEvent of eachValueFrom(event$)) {
              eventCount++;
              
              // Extract message and status
              const { text, status } = extractMessageFromEvent(agentEvent);
              
              // Send status update if it changed
              if (status && status !== lastStatus) {
                socket.send(JSON.stringify({
                  type: "status",
                  status: status.toLowerCase().replace(/\s+/g, '_'),
                  message: status
                }));
                lastStatus = status;
              }
              
              // Send message content if available
              // Also check for text in various event structures
              let messageText = text;
              if (!messageText) {
                // Try to extract from event directly
                if (typeof agentEvent.text === 'string' && agentEvent.text.trim()) {
                  messageText = agentEvent.text;
                } else if (typeof agentEvent.content === 'string' && agentEvent.content.trim()) {
                  messageText = agentEvent.content;
                } else if (agentEvent.message && typeof agentEvent.message === 'string') {
                  messageText = agentEvent.message;
                }
              }
              
              // Only do basic cleaning on streaming chunks (no sentence splitting)
              messageText = cleanAgentResponse(messageText);
              
              if (messageText && messageText.trim()) {
                socket.send(JSON.stringify({
                  type: "message",
                  content: messageText,
                  eventType: agentEvent.type || 'unknown',
                  timestamp: Date.now()
                }));
              }
              
              // On completion, send a cleaned final version
              if (agentEvent.type === 'task_complete' || agentEvent.type === 'completed') {
                // Final cleanup will be done on frontend when message is complete
              }
              
              // Send tool call information
              if (agentEvent.type === 'tool_call') {
                socket.send(JSON.stringify({
                  type: "tool_call",
                  toolName: agentEvent.tool_name || 'unknown',
                  arguments: agentEvent.arguments,
                  timestamp: Date.now()
                }));
              }
              
              // Send tool result summary
              if (agentEvent.type === 'tool_result') {
                const result = agentEvent.result || agentEvent;
                const resultStr = typeof result === 'string' ? result.substring(0, 200) : JSON.stringify(result).substring(0, 200);
                socket.send(JSON.stringify({
                  type: "tool_result",
                  toolName: agentEvent.tool_name || 'unknown',
                  result: resultStr,
                  timestamp: Date.now()
                }));
              }
              
              // Handle task completion
              if (agentEvent.type === 'task_complete' || agentEvent.type === 'completed') {
                socket.send(JSON.stringify({
                  type: "status",
                  status: "complete",
                  message: "Task completed"
                }));
                socket.send(JSON.stringify({
                  type: "complete",
                  message: "Research completed successfully",
                  eventCount,
                  timestamp: Date.now()
                }));
                break;
              }
              
              // Handle errors
              if (agentEvent.type === 'error' || agentEvent.type === 'tool_error') {
                const errorMsg = agentEvent.message || agentEvent.error || 'An error occurred';
                socket.send(JSON.stringify({
                  type: "error",
                  message: errorMsg,
                  timestamp: Date.now()
                }));
              }
            }
          } catch (error) {
            console.error("[WebSocket] Error processing task:", error);
            
            // Check for authentication errors
            let errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
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
            
            socket.send(JSON.stringify({
              type: "error",
              message: errorMessage,
              timestamp: Date.now()
            }));
          }
        } else {
          socket.send(JSON.stringify({
            type: "error",
            message: "Invalid request. Expected { type: 'research', personName: string }"
          }));
        }
      } catch (error) {
        console.error("[WebSocket] Error parsing message:", error);
        socket.send(JSON.stringify({
          type: "error",
          message: "Failed to parse request"
        }));
      }
    };
    
    socket.onerror = (error: Event) => {
      console.error("[WebSocket] Error:", error);
    };
    
    socket.onclose = () => {
      console.log("[WebSocket] Client disconnected");
    };
    
    return response;
  }

  // Health check endpoint
  if (url.pathname === "/health" && request.method === "GET") {
    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Research endpoint
  if (url.pathname === "/api/research" && request.method === "POST") {
    try {
      const body = await request.json();
      const { personName } = body;

      if (!personName || typeof personName !== "string") {
        return new Response(
          JSON.stringify({ error: "personName is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
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
                controller.enqueue(data);
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
              
              // Detailed logging for all events
              const eventType = event.type || 'unknown';
              
              // Log the actual event structure for debugging
              console.log(`[Event #${eventCount}] Type: ${eventType}`);
              console.log(`  Event keys:`, Object.keys(event));
              if (event.text) console.log(`  text:`, typeof event.text === 'string' ? event.text.substring(0, 50) : typeof event.text);
              if (event.content) console.log(`  content:`, typeof event.content === 'string' ? event.content.substring(0, 50) : typeof event.content);
              if (event.message) console.log(`  message:`, typeof event.message === 'string' ? event.message.substring(0, 50) : typeof event.message);
              
              // Log tool calls in detail
              if (event.type === 'tool_call' || event.tool_name) {
                console.log(`  Tool: ${event.tool_name || 'unknown'}`);
                if (event.arguments) {
                  console.log(`  Args: ${JSON.stringify(event.arguments).substring(0, 200)}`);
                }
              }
              
              // Log tool results
              if (event.type === 'tool_result') {
                console.log(`  Tool Result: ${JSON.stringify(event.result || event).substring(0, 200)}`);
              }
              
              // Filter out non-fatal MCP tool errors - they're logged but don't stop execution
              if (event.type === 'tool_error' || event.type === 'error') {
                const eventStr = JSON.stringify(event);
                const errorMsg = (event.message || event.error || eventStr || '').toLowerCase();
                
                // Check for authentication errors - these are FATAL and should stop execution
                if (errorMsg.includes('authentication') || 
                    errorMsg.includes('api-key') || 
                    errorMsg.includes('invalid x-api-key') ||
                    errorMsg.includes('401') ||
                    (errorMsg.includes('status') && errorMsg.includes('401'))) {
                  console.error(`[FATAL] Authentication error detected:`, event);
                  const authError = JSON.stringify({
                    type: 'fatal_authentication_error',
                    message: 
                      `❌ Authentication Error: Invalid API Key\n\n` +
                      `Your ANTHROPIC_API_KEY appears to be invalid or expired.\n` +
                      `Please:\n` +
                      `1. Check your .env file has a valid key\n` +
                      `2. Get a new key at: https://console.anthropic.com/\n` +
                      `3. Restart the server after updating the key\n\n` +
                      `Original error: ${event.message || event.error || 'Authentication failed'}`,
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
                  console.warn(`[Non-fatal Error] ${event.type} - agent will retry`);
                // Still send a notification to frontend
                const errorNotification = JSON.stringify({
                  type: 'tool_error_retry',
                  message: 'Tool error occurred, trying alternative method...',
                  tool: event.tool_name || 'unknown',
                  timestamp: Date.now()
                });
                safeEnqueue(`data: ${errorNotification}\n\n`);
                continue;
                }
                // For other errors, still send them but mark as warnings
                const warningData = JSON.stringify({
                  ...event,
                  warning: true,
                  message: 'Tool error occurred, agent will attempt alternative methods'
                });
                safeEnqueue(`data: ${warningData}\n\n`);
                continue;
              }
              
              // Send all events to frontend with enhanced metadata
              const enhancedEvent = {
                ...event,
                eventNumber: eventCount,
                timestamp: Date.now(),
                _debug: {
                  type: eventType,
                  hasContent: !!event.content,
                  hasText: !!event.text,
                  hasMessage: !!event.message
                }
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
          ...corsHeaders,
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
          errorStr.includes("environment variable") && errorStr.includes("not set")) {
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
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  }

  // 404 for unknown routes
  return new Response("Not Found", { 
    status: 404,
    headers: corsHeaders,
  });
}

// Start server
const port = parseInt(Deno.env.get("PORT") || "8000");
console.log(`🚀 Zypher Agent Server running on http://localhost:${port}`);
console.log(`📝 Note: Firecrawl MCP parameter errors in the logs are expected and non-fatal.`);
console.log(`   These occur when the agent tries Firecrawl tools, but the agent will`);
console.log(`   automatically retry with alternative methods and continue execution.\n`);

Deno.serve({ port }, handleRequest);

