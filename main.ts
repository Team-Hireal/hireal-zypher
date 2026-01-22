import {
  AnthropicModelProvider,
  createZypherContext,
  ZypherAgent,
} from "@zypher/agent";
import { eachValueFrom } from "npm:rxjs-for-await";

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
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value;
}

// Load .env file before proceeding
await loadEnvFile();

// Initialize the agent execution context
const zypherContext = await createZypherContext(Deno.cwd());

// Create the agent with your preferred LLM provider
const agent = new ZypherAgent(
  zypherContext,
  new AnthropicModelProvider({
    apiKey: getRequiredEnv("ANTHROPIC_API_KEY"),
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
      FIRECRAWL_API_KEY: getRequiredEnv("FIRECRAWL_API_KEY"),
    },
  },
});

// Run a task - the agent will use web crawling to find current AI news
const event$ = agent.runTask(
  `Find latest AI news`,
  "claude-sonnet-4-20250514",
);

// Stream the results in real-time
for await (const event of eachValueFrom(event$)) {
  console.log(event);
}

