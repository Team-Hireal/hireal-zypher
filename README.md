# Hireal Zypher

A Zypher Agent implementation for Hireal using Anthropic's Claude and Firecrawl MCP server.

## Prerequisites

- Deno 2.0+ ([install here](https://deno.com/))
- API Keys:
  - Anthropic API key ([get one here](https://console.anthropic.com/))
  - Firecrawl API key ([get one here](https://www.firecrawl.dev/))

## Setup

1. Clone the repository:
```bash
git clone https://github.com/TeamJobHatch/hireal-zypher.git
cd hireal-zypher
```

2. Install dependencies:
```bash
deno add jsr:@zypher/agent
deno add npm:rxjs-for-await
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your API keys
```

4. Run the agent:
```bash
deno task start
# or
deno run -A main.ts
```

## Usage

The agent is configured to:
- Use Anthropic's Claude Sonnet 4 model
- Connect to Firecrawl MCP server for web crawling capabilities
- Run tasks and stream results in real-time

### Example Tasks

You can modify the task in `main.ts`:
- `"Find latest AI news"` - Web crawling example
- `"What are the benefits of using AI agents?"` - Question answering
- `"Write a hello world program in TypeScript"` - Code generation

## Interactive CLI Mode

For an interactive chat interface, you can use `runAgentInTerminal`:

```typescript
import { runAgentInTerminal } from "@zypher/agent";

// After creating and initializing your agent
await runAgentInTerminal(agent, "claude-sonnet-4-20250514");
```

## Resources

- [Zypher Agent Documentation](https://zypher.dev/)
- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Firecrawl Documentation](https://docs.firecrawl.dev/)

