# Third-Party API Configuration Guide

## Problem
Getting a 401 error: "无效的令牌" (Invalid token) when using a third-party API provider.

## Solution
Configure a custom base URL for your third-party API provider.

## Setup Instructions

### 1. Add Base URL to Environment Variables

Edit your `.env` file and add:

```bash
ANTHROPIC_BASE_URL=https://api.your-provider.com/v1
```

**Common third-party providers:**
- **OpenRouter**: `https://openrouter.ai/api/v1`
- **Helicone**: `https://anthropic.helicone.ai`
- **Custom proxy**: Your provider's base URL

### 2. Update Your API Key

Make sure your `ANTHROPIC_API_KEY` in `.env` is set to your third-party provider's API key:

```bash
ANTHROPIC_API_KEY=your-third-party-api-key-here
ANTHROPIC_BASE_URL=https://api.your-provider.com/v1
```

### 3. Restart the Server

```bash
deno run --allow-all server.ts
```

You should see:
```
Using custom Anthropic base URL: https://api.your-provider.com/v1
```

## Verification

Test the configuration:

```bash
curl http://localhost:8000/api/research \
  -H "Content-Type: application/json" \
  -d '{"query": "test query"}'
```

If configured correctly, you should no longer see the 401 error.

## Troubleshooting

### Still getting 401 errors?

1. **Check your API key format**: Different providers have different key formats
2. **Verify the base URL**: Make sure it ends with `/v1` or the correct path
3. **Check provider documentation**: Some providers require additional headers or configuration

### Common Issues

- **Missing `/v1` suffix**: Some providers require the full path including `/v1`
- **Wrong protocol**: Make sure to use `https://` not `http://`
- **API key format**: Some providers use different prefixes (e.g., `sk-or-` for OpenRouter)

## Files Modified

- `types/zypher-agent.d.ts` - Added `baseURL` support to type definition
- `server.ts` - Added base URL configuration
- `main.ts` - Added base URL configuration
- `.env.example` - Added example configuration

## Example Configurations

### OpenRouter
```bash
ANTHROPIC_API_KEY=sk-or-v1-your-key-here
ANTHROPIC_BASE_URL=https://openrouter.ai/api/v1
```

### Helicone (Anthropic proxy)
```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_BASE_URL=https://anthropic.helicone.ai
```

### Custom Proxy
```bash
ANTHROPIC_API_KEY=your-custom-key
ANTHROPIC_BASE_URL=https://your-proxy.com/v1
```
