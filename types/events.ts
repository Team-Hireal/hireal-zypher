// Event types shared between frontend and backend

export type EventCategory =
  | "assistant_text"   // Assistant textual response
  | "tool_start"       // Tool execution started
  | "tool_complete"    // Tool execution completed
  | "tool_error"       // Tool execution failed
  | "status"           // Status update
  | "complete"         // Task completed
  | "error";           // Fatal error

// Base event interface
export interface BaseEvent {
  category: EventCategory;
  timestamp: number;
}

// Assistant text event
export interface TextEvent extends BaseEvent {
  category: "assistant_text";
  content: string;
}

// Tool start event
export interface ToolStartEvent extends BaseEvent {
  category: "tool_start";
  toolId: string;
  toolName: string;
  displayName: string; // User-friendly display name
}

// Tool completion event
export interface ToolCompleteEvent extends BaseEvent {
  category: "tool_complete";
  toolId: string;
  toolName: string;
  resultSummary?: string; // Short result summary
}

// Tool error event
export interface ToolErrorEvent extends BaseEvent {
  category: "tool_error";
  toolId: string;
  toolName: string;
  message: string;     // User-friendly error message
  isRetrying: boolean;
}

// Status update event
export interface StatusEvent extends BaseEvent {
  category: "status";
  message: string;
}

// Completion event
export interface CompleteEvent extends BaseEvent {
  category: "complete";
  totalDuration: number;
  toolsUsed: number;
}

// Fatal error event
export interface ErrorEvent extends BaseEvent {
  category: "error";
  message: string;
  isAuthError?: boolean;
}

// Union of all stream events
export type StreamEvent =
  | TextEvent
  | ToolStartEvent
  | ToolCompleteEvent
  | ToolErrorEvent
  | StatusEvent
  | CompleteEvent
  | ErrorEvent;

// Tool display name mappings

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  mcp__firecrawl__firecrawl_search: "Web Search",
  mcp__firecrawl__firecrawl_scrape: "Page Scrape",
  mcp__firecrawl__firecrawl_crawl: "Site Crawl",
  mcp__firecrawl__firecrawl_map: "Site Map",
  firecrawl_search: "Web Search",
  firecrawl_scrape: "Page Scrape",
  firecrawl_crawl: "Site Crawl",
  firecrawl_map: "Site Map",
};

export function getToolDisplayName(toolName: string): string {
  return (
    TOOL_DISPLAY_NAMES[toolName] ||
    toolName.replace(/^mcp__\w+__/, "").replace(/_/g, " ")
  );
}

// Simplify technical errors into user-friendly messages

export function simplifyErrorMessage(
  error: string,
  toolName: string,
): string {
  const errorLower = error.toLowerCase();

  if (
    errorLower.includes("not currently supported") ||
    errorLower.includes("linkedin")
  ) {
    return "Some sources are unavailable. Trying alternative methods...";
  }

  if (errorLower.includes("parameter validation failed")) {
    return "Adjusting search parameters and retrying...";
  }

  if (errorLower.includes("timeout") || errorLower.includes("timed out")) {
    return "Request timed out. Retrying...";
  }

  if (errorLower.includes("rate limit")) {
    return "Too many requests. Please try again later.";
  }

  if (
    errorLower.includes("authentication") ||
    errorLower.includes("api-key")
  ) {
    return "API authentication failed. Please check configuration.";
  }

  return "An issue occurred. Trying alternative methods...";
}
