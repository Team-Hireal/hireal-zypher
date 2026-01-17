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

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

// Agent singleton

let agent: ZypherAgent | null = null;

async function getAgent(): Promise<ZypherAgent> {
  if (agent) return agent;

  await loadEnvFile();
  const anthropicKey = getRequiredEnv("ANTHROPIC_API_KEY");
  const firecrawlKey = getRequiredEnv("FIRECRAWL_API_KEY");

  const ctx = await createZypherContext(Deno.cwd());
  agent = new ZypherAgent(
    ctx,
    new AnthropicModelProvider({ apiKey: anthropicKey }),
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

  return agent;
}

// Query classification & prompt

function isResearchQuery(query: string): boolean {
  const q = query.trim();
  if (/^(hi|hello|hey|thanks?|yes|no|ok|help)[\s!.,]*$/i.test(q)) return false;
  if (/^(who are you|what can you do)/i.test(q)) return false;
  if (/(research|find|search|tell me about|who is|information about)/i.test(q))
    return true;
  if (/[A-Z][a-z]+(\s*\([A-Za-z]+\))?\s+[A-Z][a-z]+/.test(q)) return true;
  return false;
}

function createTask(query: string, isResearch: boolean): string {
  if (!isResearch) {
    return `You are a friendly AI assistant. User said: "${query}". Respond in 1-2 sentences. Do NOT use tools.`;
  }

  return `Research comprehensive information about ${query}.

Gather: name, location, professional history, education, notable facts.
Use web search tools. Cross-reference sources.

IMPORTANT RULES:
1. Output ONLY the final structured summary in Markdown format.
2. Do NOT output thinking process like "Let me search...", "I'll try...", "I found...".
3. Only include VERIFIED information that matches the person's name exactly.
4. If you find multiple people with similar names, clearly state this and ask for clarification.
5. Do NOT guess or assume affiliations without evidence.

Begin research and output only the final summary.`;
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
    const { personName } = await req.json();
    if (!personName) {
      return new Response(JSON.stringify({ error: "personName required" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const isResearch = isResearchQuery(personName);
    const task = createTask(personName, isResearch);
    console.log(
      `[Request] "${personName}" | ${isResearch ? "Research" : "Chat"}`,
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
          const events = ag.runTask(task, "claude-sonnet-4-20250514");

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
