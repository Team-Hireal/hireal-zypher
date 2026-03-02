import { NextRequest } from "next/server";
import { AnthropicModelProvider, createZypherContext, ZypherAgent } from "@zypher/agent";
import { eachValueFrom } from "rxjs-for-await";

// Load environment variables from .env file if it exists
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

  const primaryBaseURL = Deno.env.get("ANTHROPIC_BASE_URL")?.trim();
  const fallbackBaseURL = Deno.env.get("ANTHROPIC_BASE_URL_FALLBACK")?.trim();
  const anthropicBaseURL = primaryBaseURL || fallbackBaseURL || undefined;

  const ctx = await createZypherContext(Deno.cwd());

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

  try {
    await agent.mcp.registerServer({
      id: "firecrawl",
      type: "command",
      command: {
        command: "npx",
        args: ["-y", "firecrawl-mcp"],
        env: { FIRECRAWL_API_KEY: firecrawlKey },
      },
    });
    console.log("Firecrawl MCP server registered");
  } catch (error) {
    console.warn("Failed to register Firecrawl MCP server:", error);
  }

  try {
    await agent.mcp.registerServer({
      id: "wayback-machine",
      type: "command",
      command: {
        command: "deno",
        args: ["run", "--allow-net", "--allow-env", "./mcp-servers/wayback-server.ts"],
        env: {},
      },
    });
    console.log("Wayback Machine MCP server registered");
  } catch (error) {
    console.warn("Failed to register Wayback Machine MCP server:", error);
  }

  return agent;
}

function isResearchQuery(query: string): boolean {
  const q = query.trim();
  if (/^(hi|hello|hey|thanks?|yes|no|ok|help)[\s!.,]*$/i.test(q)) return false;
  if (/^(who are you|what can you do)/i.test(q)) return false;
  if (/(research|find|search|analyze|compare|verify|check|investigate|examine|review|assess|evaluate|show|get|retrieve|fetch|list|identify|track|monitor|audit|validate|tell me about|information about|who is|what is|details about|background on)/i.test(q))
    return true;
  if (/(website|site|domain|url|web|archive|wayback|snapshot|changes|history|evolution|timeline)/i.test(q))
    return true;
  if (/(due diligence|background|profile|credentials|verification|validate|confirm)/i.test(q))
    return true;
  if (/(difference|vs|versus|between|compare|contrast)/i.test(q))
    return true;
  if (/\b[a-z0-9-]+\.(com|org|net|io|ai|co|dev|app|tech)\b/i.test(q))
    return true;
  if (/[A-Z][a-z]+(\s*\([A-Za-z]+\))?\s+[A-Z][a-z]+/.test(q))
    return true;
  return false;
}

function createTask(query: string, isResearch: boolean, conversationHistory: Array<{role: string, content: string}> = []): string {
  let contextSection = '';
  if (conversationHistory.length > 0) {
    contextSection = '\n\nCONVERSATION CONTEXT (last 10 messages):\n';
    conversationHistory.forEach((msg) => {
      contextSection += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    });
    contextSection += `\nCurrent User Query: ${query}\n`;
  }

  if (!isResearch) {
    return `You are Hunter, a background verification and due diligence AI agent.${contextSection ? contextSection : ` User said: "${query}".`} Respond in 1-2 sentences. If asked about what framework powers you, mention you are powered by the CoreSpeed Zypher framework.`;
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { personName, conversationHistory } = body;

    if (!personName || typeof personName !== "string") {
      return new Response(
        JSON.stringify({ error: "personName is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
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

        const send = (data: Record<string, unknown>) => {
          if (closed) return;
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
            );
          } catch {
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

        try {
          const ag = await getAgent();
          const events = ag.runTask(task, "claude-sonnet-4-5-20250929");

          let buffer = '';

          for await (const e of eachValueFrom(events)) {
            switch (e.type) {
              case "text":
                if (e.content) {
                  buffer += e.content;
                  // Send in chunks
                  const sentences = buffer.split(/(?<=[.!?])\s+/);
                  while (sentences.length > 1) {
                    send({ category: "assistant_text", timestamp: Date.now(), content: sentences.shift() });
                  }
                  buffer = sentences[0] || '';
                }
                break;

              case "tool_use":
                if (e.toolUseId && e.toolName) {
                  send({
                    category: "tool_start",
                    timestamp: Date.now(),
                    toolId: e.toolUseId,
                    toolName: e.toolName,
                    displayName: `Using: ${e.toolName}`,
                  });
                }
                break;

              case "tool_use_result":
                if (e.toolUseId) {
                  send({
                    category: "tool_complete",
                    timestamp: Date.now(),
                    toolId: e.toolUseId,
                  });
                }
                break;

              case "tool_use_error":
                if (e.toolUseId) {
                  send({
                    category: "tool_error",
                    timestamp: Date.now(),
                    toolId: e.toolUseId,
                    message: String(e.error?.message || e.error || "Tool error"),
                  });
                }
                break;

              case "completed":
                if (buffer) {
                  send({ category: "assistant_text", timestamp: Date.now(), content: buffer });
                }
                send({
                  category: "complete",
                  timestamp: Date.now(),
                  duration: 0,
                  toolsUsed: 0,
                });
                clearInterval(keepAlive);
                closed = true;
                controller.close();
                return;
            }
          }

          clearInterval(keepAlive);
          if (buffer) {
            send({ category: "assistant_text", timestamp: Date.now(), content: buffer });
          }
          closed = true;
          controller.close();
        } catch (err) {
          clearInterval(keepAlive);
          send({
            category: "error",
            timestamp: Date.now(),
            message: err instanceof Error ? err.message : "Unknown error",
          });
          closed = true;
          controller.close();
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
    console.error(`[API] Error:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
