# Wayback Machine API Implementation Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Request                            │
│              "Analyze changes to skyrisai.com"                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Hunter Agent (server.ts)                     │
│  • Receives query with conversation history                     │
│  • Classifies as research query                                 │
│  • Creates task with explicit Wayback Machine instructions      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Wayback Machine MCP Server                         │
│           (mcp-servers/wayback-server.ts)                       │
│                                                                 │
│  Registered at server.ts:75-82                                  │
│  Command: deno run --allow-net --allow-env                      │
│                                                                 │
│  Exposes 5 Tools:                                               │
│  ├─ check_wayback_availability                                  │
│  ├─ compare_wayback_snapshots                                   │
│  ├─ get_oldest_snapshot                                         │
│  ├─ get_newest_snapshot                                         │
│  └─ is_url_archived                                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Core Utility Functions                             │
│           (utils/waybackMachine.ts)                             │
│                                                                 │
│  • checkWaybackAvailability(url, timestamp?)                    │
│  • getOldestSnapshot(url)                                       │
│  • getNewestSnapshot(url)                                       │
│  • compareSnapshots(url)                                        │
│  • isUrlArchived(url)                                           │
│  • formatWaybackTimestamp(timestamp)                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Internet Archive Wayback API                       │
│         https://archive.org/wayback/available                   │
│                                                                 │
│  Returns: archived snapshots with URLs and timestamps           │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Files

### 1. Core API Integration
**File:** `utils/waybackMachine.ts` (144 lines)

This is where the actual Wayback Machine API calls happen:

```typescript
// Main API call function
export async function checkWaybackAvailability(
  url: string,
  timestamp?: string
): Promise<WaybackSnapshot> {
  const cleanUrl = url.replace(/^https?:\/\//, '');
  let apiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(cleanUrl)}`;

  if (timestamp) {
    apiUrl += `&timestamp=${timestamp}`;
  }

  const response = await fetch(apiUrl);  // ← API CALL HERE
  const data: WaybackResponse = await response.json();

  return data.archived_snapshots?.closest || { available: false };
}
```

**Key Functions:**
- `checkWaybackAvailability()` - Lines 34-63: Makes HTTP request to Wayback API
- `getOldestSnapshot()` - Lines 70-73: Gets first archived version (timestamp: 19960101)
- `getNewestSnapshot()` - Lines 80-83: Gets latest archived version
- `compareSnapshots()` - Lines 90-113: Compares oldest vs newest
- `isUrlArchived()` - Lines 140-143: Boolean check
- `formatWaybackTimestamp()` - Lines 120-133: Formats timestamps

**API Endpoint Used:**
```
https://archive.org/wayback/available?url=<URL>&timestamp=<OPTIONAL>
```

**Response Format:**
```json
{
  "archived_snapshots": {
    "closest": {
      "available": true,
      "url": "http://web.archive.org/web/20260130100504/https://example.com/",
      "timestamp": "20260130100504",
      "status": "200"
    }
  }
}
```

### 2. MCP Server (Tool Wrapper)
**File:** `mcp-servers/wayback-server.ts` (292 lines)

This wraps the utility functions as MCP tools that the agent can call:

```typescript
// Tool definitions (lines 46-121)
const TOOLS: Tool[] = [
  {
    name: "check_wayback_availability",
    description: "Check if a URL is archived...",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The URL to check" },
        timestamp: { type: "string", description: "Optional timestamp" }
      },
      required: ["url"]
    }
  },
  // ... 4 more tools
];

// Tool execution handler (lines 123-161)
async function handleToolCall(toolName: string, args: Record<string, unknown>) {
  switch (toolName) {
    case "check_wayback_availability":
      const result = await checkWaybackAvailability(url, timestamp);
      return formatSnapshotResult(result);
    // ... other cases
  }
}

// MCP protocol handler (lines 196-266)
async function handleRequest(request: MCPRequest): Promise<MCPResponse> {
  switch (method) {
    case "initialize": // Server initialization
    case "tools/list":  // List available tools
    case "tools/call":  // Execute a tool
  }
}

// Main server loop (lines 269-287)
async function main() {
  for await (const chunk of Deno.stdin.readable) {
    const request = JSON.parse(text);
    const response = await handleRequest(request);
    await Deno.stdout.write(encoder.encode(JSON.stringify(response)));
  }
}
```

**Communication:** JSON-RPC 2.0 over stdin/stdout

### 3. Server Registration
**File:** `server.ts` (Lines 74-82)

This registers the MCP server with the Hunter agent:

```typescript
// Register Wayback Machine MCP server
await agent.mcp.registerServer({
  id: "wayback-machine",
  type: "command",
  command: {
    command: "deno",
    args: ["run", "--allow-net", "--allow-env", "./mcp-servers/wayback-server.ts"],
    env: {},
  },
});
```

**What this does:**
- Spawns the Wayback MCP server as a subprocess
- Connects it to the agent via stdin/stdout
- Makes all 5 tools available to the agent

### 4. Agent Prompt Configuration
**File:** `server.ts` (Lines 100-157)

The agent is explicitly told about the Wayback Machine tools:

```typescript
function createTask(query: string, isResearch: boolean, conversationHistory) {
  return `You are Hunter, a background verification and due diligence agent.

AVAILABLE TOOLS:
You have access to the following Wayback Machine tools - USE THEM when analyzing websites:
- compare_wayback_snapshots: Compare oldest vs newest snapshots to detect changes
- get_oldest_snapshot: Get the first archived version of a website
- get_newest_snapshot: Get the most recent archived version
- check_wayback_availability: Check if a URL is archived
- is_url_archived: Quick boolean check for archive existence

WHEN TO USE WAYBACK MACHINE:
- When asked to analyze website changes or history
- When verifying claims about past website content
- When investigating company history or evolution
...`;
}
```

## Data Flow Example

**User Query:** "Analyze changes to skyrisai.com"

1. **Frontend** (ChatInterface.tsx:214)
   ```typescript
   fetch('/api/research', {
     body: JSON.stringify({
       personName: "Analyze changes to skyrisai.com",
       conversationHistory: [...]
     })
   })
   ```

2. **API Route** (app/api/research/route.ts:22)
   ```typescript
   fetch(`${DENO_SERVER_URL}/api/research`, {
     body: JSON.stringify({ personName, conversationHistory })
   })
   ```

3. **Deno Server** (server.ts:187-197)
   ```typescript
   const { personName, conversationHistory } = await req.json();
   const task = createTask(personName, true, conversationHistory);
   const events = agent.runTask(task, "claude-sonnet-4-5-20250929");
   ```

4. **Agent Decision**
   - Sees "analyze changes" in query
   - Reads prompt: "ALWAYS use Wayback Machine tools when analyzing websites"
   - Decides to call `compare_wayback_snapshots`

5. **MCP Server Call** (mcp-servers/wayback-server.ts:134-137)
   ```typescript
   case "compare_wayback_snapshots":
     const result = await compareSnapshots(url);
     return formatComparisonResult(result);
   ```

6. **API Call** (utils/waybackMachine.ts:92-95)
   ```typescript
   const [oldest, newest] = await Promise.all([
     getOldestSnapshot(url),  // → fetch('https://archive.org/wayback/available?url=skyrisai.com&timestamp=19960101')
     getNewestSnapshot(url)   // → fetch('https://archive.org/wayback/available?url=skyrisai.com')
   ]);
   ```

7. **Response Chain**
   ```
   Wayback API → utils/waybackMachine.ts → mcp-servers/wayback-server.ts
   → Agent → server.ts → API route → Frontend
   ```

## Testing the Implementation

### Test 1: Direct API Call
```bash
deno run --allow-net utils/waybackMachine.test.ts
```

### Test 2: MCP Server
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  deno run --allow-net --allow-env ./mcp-servers/wayback-server.ts
```

### Test 3: Full Integration
```bash
# Start server
deno run --allow-all server.ts

# Send request
curl http://localhost:8000/api/research \
  -H "Content-Type: application/json" \
  -d '{"personName": "analyze skyrisai.com"}'
```

## Key Implementation Details

### API Rate Limiting
The Wayback Machine API has no explicit rate limits, but we use:
- Parallel requests for comparison (`Promise.all`)
- Error handling with graceful fallbacks
- No retry logic (returns `available: false` on error)

### Timestamp Format
- Format: `YYYYMMDDhhmmss` (14 digits)
- Example: `20260130100504` = 2026-01-30 10:05:04
- Oldest: `19960101` (Internet Archive start date)
- Newest: No timestamp (returns most recent)

### Error Handling
```typescript
try {
  const response = await fetch(apiUrl);
  if (!response.ok) throw new Error(`Status ${response.status}`);
  return data.archived_snapshots?.closest || { available: false };
} catch (error) {
  console.error('Error:', error);
  return { available: false };  // Graceful fallback
}
```

## Files Summary

| File | Lines | Purpose |
|------|-------|---------|
| `utils/waybackMachine.ts` | 144 | Core API integration |
| `mcp-servers/wayback-server.ts` | 292 | MCP tool wrapper |
| `server.ts` (registration) | 9 | Server registration |
| `server.ts` (prompt) | 58 | Agent instructions |
| `utils/waybackMachine.test.ts` | 2375 | Test suite |

**Total Implementation:** ~500 lines of code

## Status: ✅ Fully Implemented and Tested

All components are working and integrated into the Hunter agent.
