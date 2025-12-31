# Hireal Zypher Agent

A Zypher Agent implementation for Hireal, powered by Anthropic's Claude and Firecrawl MCP server.

## Prerequisites

- Deno 2.0+ ([install here](https://deno.land))
- API Keys:
  - Anthropic API key ([get here](https://console.anthropic.com))
  - Firecrawl API key ([get here](https://firecrawl.dev))

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd hireal-zypher
```

2. Install dependencies:
```bash
deno install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your API keys
```

4. Run the agent:
```bash
deno task start
```

Or use the dev task for watch mode:
```bash
deno task dev
```

## Usage

The agent is configured to find the latest AI news using web crawling capabilities via Firecrawl MCP server.

You can modify the task in `main.ts` to run different tasks:

```typescript
// Ask questions
agent.runTask("What are the benefits of using AI agents?")

// Give instructions
agent.runTask("Write a hello world program in TypeScript")

// Request analysis
agent.runTask("List the pros and cons of different programming languages")
```

## Interactive CLI Mode

For an interactive experience, you can use the built-in terminal interface:

```typescript
import { runAgentInTerminal } from "@zypher/agent";

await runAgentInTerminal(agent, "claude-sonnet-4-20250514");
```

## Project Structure

- `main.ts` - Main agent implementation
- `deno.json` - Deno configuration and tasks
- `.env` - Environment variables (not in git)
- `.env.example` - Environment variables template

## Resources

- [Zypher Agent Documentation](https://zypher.dev)
- [Deno Documentation](https://deno.land/docs)
- [Anthropic API](https://docs.anthropic.com)
- [Firecrawl MCP](https://firecrawl.dev)

