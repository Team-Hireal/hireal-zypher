#!/usr/bin/env -S deno run --allow-net --allow-env

/**
 * Wayback Machine MCP Server
 * Provides tools for checking archived versions of websites using the Internet Archive
 */

import {
  checkWaybackAvailability,
  compareSnapshots,
  formatWaybackTimestamp,
  getNewestSnapshot,
  getOldestSnapshot,
  isUrlArchived,
  type WaybackSnapshot,
  type WaybackComparisonResult,
} from "../utils/waybackMachine.ts";

interface MCPRequest {
  jsonrpc: string;
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: string;
  id: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
}

interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

const TOOLS: Tool[] = [
  {
    name: "check_wayback_availability",
    description: "Check if a URL is archived in the Wayback Machine and get snapshot information",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to check in the Wayback Machine",
        },
        timestamp: {
          type: "string",
          description: "Optional timestamp in format YYYYMMDDhhmmss (1-14 digits)",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "compare_wayback_snapshots",
    description: "Compare the oldest and newest archived snapshots of a URL to see if it has changed over time",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to compare snapshots for",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "get_oldest_snapshot",
    description: "Get the oldest archived snapshot of a URL from the Wayback Machine",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to get the oldest snapshot for",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "get_newest_snapshot",
    description: "Get the most recent archived snapshot of a URL from the Wayback Machine",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to get the newest snapshot for",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "is_url_archived",
    description: "Check if a URL has been archived in the Wayback Machine (returns true/false)",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to check",
        },
      },
      required: ["url"],
    },
  },
];

async function handleToolCall(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case "check_wayback_availability": {
      const { url, timestamp } = args as { url: string; timestamp?: string };
      const result = await checkWaybackAvailability(url, timestamp);
      return formatSnapshotResult(result);
    }

    case "compare_wayback_snapshots": {
      const { url } = args as { url: string };
      const result = await compareSnapshots(url);
      return formatComparisonResult(result);
    }

    case "get_oldest_snapshot": {
      const { url } = args as { url: string };
      const result = await getOldestSnapshot(url);
      return formatSnapshotResult(result);
    }

    case "get_newest_snapshot": {
      const { url } = args as { url: string };
      const result = await getNewestSnapshot(url);
      return formatSnapshotResult(result);
    }

    case "is_url_archived": {
      const { url } = args as { url: string };
      const result = await isUrlArchived(url);
      return { archived: result };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

function formatSnapshotResult(snapshot: WaybackSnapshot): Record<string, unknown> {
  if (!snapshot.available) {
    return {
      available: false,
      message: "No archived snapshot found for this URL",
    };
  }

  return {
    available: true,
    url: snapshot.url,
    timestamp: snapshot.timestamp,
    formattedDate: snapshot.timestamp ? formatWaybackTimestamp(snapshot.timestamp) : undefined,
    status: snapshot.status,
  };
}

function formatComparisonResult(result: WaybackComparisonResult): Record<string, unknown> {
  if (result.error) {
    return {
      error: result.error,
      url: result.url,
    };
  }

  return {
    url: result.url,
    hasChanges: result.hasChanges,
    oldestSnapshot: result.oldestSnapshot ? formatSnapshotResult(result.oldestSnapshot) : null,
    newestSnapshot: result.newestSnapshot ? formatSnapshotResult(result.newestSnapshot) : null,
  };
}

async function handleRequest(request: MCPRequest): Promise<MCPResponse> {
  const { id, method, params } = request;

  try {
    switch (method) {
      case "initialize":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: "wayback-machine-server",
              version: "1.0.0",
            },
          },
        };

      case "tools/list":
        return {
          jsonrpc: "2.0",
          id,
          result: {
            tools: TOOLS,
          },
        };

      case "tools/call": {
        const { name, arguments: args } = params as {
          name: string;
          arguments: Record<string, unknown>;
        };
        const result = await handleToolCall(name, args);
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          },
        };
      }

      default:
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
        };
    }
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : "Internal error",
      },
    };
  }
}

// Main server loop
async function main() {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  console.error("[Wayback MCP Server] Starting...");

  for await (const chunk of Deno.stdin.readable) {
    const text = decoder.decode(chunk).trim();
    if (!text) continue;

    try {
      const request = JSON.parse(text) as MCPRequest;
      const response = await handleRequest(request);
      await Deno.stdout.write(encoder.encode(JSON.stringify(response) + "\n"));
    } catch (error) {
      console.error("[Wayback MCP Server] Error:", error);
    }
  }
}

if (import.meta.main) {
  main();
}
