# Hireal Zypher

A Zypher Agent implementation for Hireal, powered by Anthropic's Claude and Firecrawl MCP server.

## Prerequisites

- Deno 2.0+ ([install here](https://deno.land))
- API Keys:
  - Anthropic API key ([get here](https://console.anthropic.com))
  - Firecrawl API key ([get here](https://firecrawl.dev))

## Setup

1. **Install dependencies:**

```bash
deno add jsr:@zypher/agent
deno add npm:rxjs-for-await
```

2. **Set up environment variables:**

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Then edit `.env` with your actual API keys.

3. **Run the agent:**

```bash
deno run -A main.ts
```

Or use the task:

```bash
deno task start
```

## Project Structure

- `main.ts` - Main agent implementation
- `deno.json` - Deno configuration and tasks
- `.env.example` - Environment variables template
- `.env` - Your actual environment variables (not committed)

## Features

- AI agent powered by Anthropic's Claude Sonnet 4
- Web crawling capabilities via Firecrawl MCP server
- Real-time event streaming
- Task-based execution

## Next Steps

- Explore different LLM providers
- Add more MCP servers for extended capabilities
- Implement checkpoints for state management
- Add loop interceptors for execution control

## Resources

- [Zypher Agent Documentation](https://zypher.dev)
- [Anthropic API Docs](https://docs.anthropic.com)
- [Firecrawl MCP](https://firecrawl.dev)

