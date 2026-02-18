import {
  AnthropicModelProvider,
  createZypherContext,
  ZypherAgent,
} from "@zypher/agent";
import { eachValueFrom } from "rxjs-for-await";
import { SentenceBuffer } from "./utils/textFilter.ts";
import { buildToolDisplayWithDetail, simplifyToolError } from "./utils/toolUtils.ts";

// Environment variables

async function loadEnvFile(): Promise<void> {
  try {
    const envFile = await Deno.readTextFile(".env");
    for (const line of envFile.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...vals] = trimmed.split("=");
      if (key && vals.length > 0 && !Deno.env.get(key.trim())) {
        Deno.env.set(key.trim(), vals.join("=").trim());
      }
    }
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) {
      console.warn("Warning: Could not load .env file");
    }
  }
}

function getEnvWithFallback(primary: string, fallback: string): string {
  const primaryValue = Deno.env.get(primary)?.trim();
  if (primaryValue) return primaryValue;
  const fallbackValue = Deno.env.get(fallback)?.trim();
  if (fallbackValue) {
    console.log(`Using fallback ${fallback}: ${fallbackValue.substring(0, 10)}...`);
    return fallbackValue;
  }
  throw new Error(`Neither ${primary} nor ${fallback} is set`);
}

// Agent singleton

let agent: ZypherAgent | null = null;

async function getAgent(): Promise<ZypherAgent> {
  if (agent) return agent;

  await loadEnvFile();
  const anthropicKey = getEnvWithFallback("ANTHROPIC_API_KEY", "ANTHROPIC_API_KEY_FALLBACK");
  const firecrawlKey = getEnvWithFallback("FIRECRAWL_API_KEY", "FIRECRAWL_API_KEY_FALLBACK");

  // Try primary base URL first, then fall back to default Anthropic API
  const primaryBaseURL = Deno.env.get("ANTHROPIC_BASE_URL")?.trim();
  const fallbackBaseURL = Deno.env.get("ANTHROPIC_BASE_URL_FALLBACK")?.trim();
  const anthropicBaseURL = primaryBaseURL || fallbackBaseURL || undefined;

  const ctx = await createZypherContext(Deno.cwd());

  // Configure Anthropic provider with optional custom base URL
  const providerOptions: { apiKey: string; baseURL?: string } = {
    apiKey: anthropicKey
  };
  if (anthropicBaseURL) {
    providerOptions.baseURL = anthropicBaseURL;
    console.log(`Using Anthropic base URL: ${anthropicBaseURL}`);
  }

  agent = new ZypherAgent(
    ctx,
    new AnthropicModelProvider(providerOptions),
  );

  await agent.mcp.registerServer({
    id: "firecrawl",
    type: "command",
    command: {
      command: "npx",
      args: ["-y", "firecrawl-mcp"],
      env: { FIRECRAWL_API_KEY: firecrawlKey },
    },
  });

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

  return agent;
}

// Query classification & prompt

function isResearchQuery(query: string): boolean {
  const q = query.trim();

  // Exclude simple greetings and acknowledgments
  if (/^(hi|hello|hey|thanks?|yes|no|ok|help)[\s!.,]*$/i.test(q)) return false;
  if (/^(who are you|what can you do)/i.test(q)) return false;

  // Task-based action verbs - these indicate the user wants something done
  if (/(research|find|search|analyze|compare|verify|check|investigate|examine|review|assess|evaluate|show|get|retrieve|fetch|list|identify|track|monitor|audit|validate)/i.test(q))
    return true;

  // Information requests
  if (/(tell me about|information about|who is|what is|details about|background on)/i.test(q))
    return true;

  // Website and archive-related queries
  if (/(website|site|domain|url|web|archive|wayback|snapshot|changes|history|evolution|timeline)/i.test(q))
    return true;

  // Due diligence and verification keywords
  if (/(due diligence|background|profile|credentials|verification|validate|confirm)/i.test(q))
    return true;

  // Comparison and analysis
  if (/(difference|vs|versus|between|compare|contrast)/i.test(q))
    return true;

  // Contains a URL or domain pattern
  if (/\b[a-z0-9-]+\.(com|org|net|io|ai|co|dev|app|tech)\b/i.test(q))
    return true;

  // Person name pattern (capitalized words)
  if (/[A-Z][a-z]+(\s*\([A-Za-z]+\))?\s+[A-Z][a-z]+/.test(q))
    return true;

  // Default to non-research for everything else
  return false;
}

function createTask(query: string, isResearch: boolean, conversationHistory: Array<{role: string, content: string}> = []): string {
  // Build conversation context if available
  let contextSection = '';
  if (conversationHistory.length > 0) {
    contextSection = '\n\nCONVERSATION CONTEXT (last 10 messages):\n';
    conversationHistory.forEach((msg, idx) => {
      contextSection += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    });
    contextSection += `\nCurrent User Query: ${query}\n`;
  }

  if (!isResearch) {
    return `You are Hunter, a background verification and due diligence AI agent.${contextSection ? contextSection : ` User said: "${query}".`} Respond in 1-2 sentences.`;
  }

  return `You are Hunter, a background verification and due diligence agent. Conduct comprehensive background research on ${query}.${contextSection}

Your mission: Verify identity, professional history, education, affiliations, and any notable information relevant for due diligence.

AVAILABLE TOOLS:
You have access to the following Wayback Machine tools - USE THEM when analyzing websites or verifying historical information:
- compare_wayback_snapshots: Compare oldest vs newest snapshots to detect changes
- get_oldest_snapshot: Get the first archived version of a website
- get_newest_snapshot: Get the most recent archived version
- check_wayback_availability: Check if a URL is archived
- is_url_archived: Quick boolean check for archive existence

WHEN TO USE WAYBACK MACHINE:
- When asked to analyze website changes or history
- When verifying claims about past website content
- When investigating company history or evolution
- When checking if information existed at a specific time
- When comparing current vs historical online presence

RESEARCH OBJECTIVES:
- Full name and known aliases
- Current and past professional positions
- Educational background and credentials
- Professional affiliations and memberships
- Notable achievements, publications, or public records
- Online presence and digital footprint
- Historical information using Wayback Machine

VERIFICATION STANDARDS:
1. ALWAYS use Wayback Machine tools when analyzing websites or historical claims
2. Cross-reference multiple sources for accuracy
3. Flag any inconsistencies or gaps in information
4. Distinguish between verified facts and unverified claims
5. Note the recency and reliability of sources

OUTPUT FORMAT:
- Present findings in a clear, structured Markdown format
- Include source citations and archive URLs when using Wayback Machine
- Highlight any red flags or areas requiring further investigation
- Do NOT include your thinking process - only present verified findings

Begin comprehensive background verification and due diligence research.`;
}

// Event types

type EventCategory =
  | "assistant_text"
  | "tool_start"
  | "tool_complete"
  | "tool_error"
  | "complete"
  | "error";

function createEvent(
  category: EventCategory,
  data: Record<string, unknown> = {},
) {
  return { category, timestamp: Date.now(), ...data };
}

// HTTP handling

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  if (url.pathname === "/health") {
    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  if (url.pathname === "/api/research" && req.method === "POST") {
    const { personName, conversationHistory } = await req.json();
    if (!personName) {
      return new Response(JSON.stringify({ error: "personName required" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const isResearch = isResearchQuery(personName);
    const task = createTask(personName, isResearch, conversationHistory || []);
    console.log(
      `[Request] "${personName}" | ${isResearch ? "Research" : "Chat"} | History: ${conversationHistory?.length || 0} messages`,
    );

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;
        const tools = new Map<string, string>();
        const toolInputs = new Map<string, string>();
        let toolCount = 0;
        const start = Date.now();

        const send = (evt: ReturnType<typeof createEvent>) => {
          if (closed) return;
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(evt)}\n\n`),
            );
          } catch {
            closed = true;
          }
        };

        const close = () => {
          if (!closed) {
            try {
              controller.close();
            } catch {}
            closed = true;
          }
        };

        const keepAlive = setInterval(() => {
          if (!closed) {
            try {
              controller.enqueue(encoder.encode(`: keepalive\n\n`));
            } catch {}
          }
        }, 15000);

        const buffer = new SentenceBuffer((sentence) => {
          send(createEvent("assistant_text", { content: sentence }));
        });

        try {
          const ag = await getAgent();
          const events = ag.runTask(task, "claude-sonnet-4-5-20250929");

          for await (const e of eachValueFrom(events)) {
            switch (e.type) {
              case "text":
                if (e.content) buffer.add(e.content);
                break;

              case "tool_use":
                if (e.toolUseId && e.toolName) {
                  toolCount++;
                  tools.set(e.toolUseId, e.toolName);
                  toolInputs.set(e.toolUseId, "");
                }
                break;

              case "tool_use_input":
                if (e.toolUseId && e.partialInput) {
                  const current = toolInputs.get(e.toolUseId) || "";
                  toolInputs.set(e.toolUseId, current + e.partialInput);
                }
                break;

              case "tool_use_approved":
                if (e.toolUseId && e.toolName) {
                  const input = toolInputs.get(e.toolUseId) || "";
                  const displayName = buildToolDisplayWithDetail(
                    e.toolName,
                    input,
                  );
                  send(
                    createEvent("tool_start", {
                      toolId: e.toolUseId,
                      toolName: e.toolName,
                      displayName,
                    }),
                  );
                }
                break;

              case "tool_use_result":
                if (e.toolUseId) {
                  send(
                    createEvent("tool_complete", {
                      toolId: e.toolUseId,
                    }),
                  );
                  tools.delete(e.toolUseId);
                  toolInputs.delete(e.toolUseId);
                }
                break;

              case "tool_use_error":
                if (e.toolUseId) {
                  send(
                    createEvent("tool_error", {
                      toolId: e.toolUseId,
                      message: simplifyToolError(
                        String(e.error?.message || e.error || ""),
                      ),
                    }),
                  );
                  tools.delete(e.toolUseId);
                  toolInputs.delete(e.toolUseId);
                }
                break;

              case "completed":
                buffer.flush();
                send(
                  createEvent("complete", {
                    duration: Math.round(
                      (Date.now() - start) / 1000,
                    ),
                    toolsUsed: toolCount,
                  }),
                );
                break;
            }
          }

          clearInterval(keepAlive);
          buffer.flush();
          close();
        } catch (err) {
          clearInterval(keepAlive);
          buffer.flush();
          send(
            createEvent("error", {
              message:
                err instanceof Error ? err.message : "Unknown error",
            }),
          );
          close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...CORS,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  }

  return new Response("Not Found", { status: 404, headers: CORS });
}

const port = parseInt(Deno.env.get("PORT") || "8000");
console.log(`🚀 Server running on http://localhost:${port}`);
Deno.serve({ port }, handleRequest);
