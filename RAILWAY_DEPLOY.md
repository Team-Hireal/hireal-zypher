# Railway Deployment Guide

This guide explains how to deploy the Hireal Zypher application to Railway.

## Prerequisites

1. A [Railway](https://railway.app) account
2. Railway CLI installed (optional): `npm i -g @railway/cli`
3. Your API keys ready:
   - `ANTHROPIC_API_KEY`
   - `FIRECRAWL_API_KEY`

## Quick Deploy

### Option 1: Deploy via Railway Dashboard (Recommended)

1. **Create a New Project**
   - Go to [Railway Dashboard](https://railway.app/dashboard)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your GitHub account and select this repository

2. **Configure Environment Variables**
   - In your Railway project, go to the "Variables" tab
   - Add the following environment variables:
     ```
     ANTHROPIC_API_KEY=your_anthropic_api_key_here
     FIRECRAWL_API_KEY=your_firecrawl_api_key_here
     ```
   - Railway will automatically set the `PORT` variable

3. **Deploy**
   - Railway will automatically detect the Dockerfile and start building
   - Wait for the deployment to complete
   - Your app will be available at the generated Railway URL

### Option 2: Deploy via Railway CLI

1. **Login to Railway**
   ```bash
   railway login
   ```

2. **Initialize Railway Project**
   ```bash
   railway init
   ```

3. **Set Environment Variables**
   ```bash
   railway variables set ANTHROPIC_API_KEY=your_anthropic_api_key_here
   railway variables set FIRECRAWL_API_KEY=your_firecrawl_api_key_here
   ```

4. **Deploy**
   ```bash
   railway up
   ```

5. **Open Your App**
   ```bash
   railway open
   ```

## Architecture

The deployment uses:
- **Deno** as the runtime (v2.1.5)
- **Node.js** (v20.x) for npx and npm packages (firecrawl-mcp)
- **Debian-based image** for better compatibility
- **Port 8000** as default (Railway overrides with its own PORT)

## API Endpoints

Once deployed, your application will have the following endpoints:

- `GET /health` - Health check endpoint
- `POST /api/research` - Research API endpoint
  ```json
  {
    "personName": "John Doe"
  }
  ```

## Dockerfile Overview

The Dockerfile:
1. Uses Debian-based Deno image (v2.1.5)
2. Installs Node.js 20.x for npx support
3. Copies deno.json and deno.lock for dependency caching
4. Installs all dependencies including @zypher/agent from JSR
5. Runs server.ts which starts the Deno HTTP server

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key for Claude |
| `FIRECRAWL_API_KEY` | Yes | Your Firecrawl API key for web scraping |
| `PORT` | No | Port to run server on (Railway sets this automatically) |

## Troubleshooting

### Build Fails with Import Errors

If you see errors about `@zypher/agent` not being found:
- Ensure `deno.json` has the correct import map
- Check that `deno install --entrypoint server.ts` runs successfully

### npx Command Not Found

If firecrawl-mcp fails to start:
- Ensure Node.js is installed in the Docker image
- Check that npm is available

### Port Binding Issues

Railway automatically sets the PORT environment variable. The server reads this in `server.ts`:
```typescript
const port = parseInt(Deno.env.get("PORT") || "8000");
```

### Memory Issues

If the deployment runs out of memory:
- Check Railway's service plan limits
- Consider upgrading to a higher tier plan

## Local Testing

To test the Docker build locally:

```bash
# Build the image
docker build -t hireal-zypher .

# Run with environment variables
docker run -p 8000:8000 \
  -e ANTHROPIC_API_KEY=your_key \
  -e FIRECRAWL_API_KEY=your_key \
  hireal-zypher
```

Then visit http://localhost:8000/health

## Monitoring

Railway provides:
- Automatic logs in the dashboard
- Metrics for CPU, memory, and network usage
- Deployment history and rollback capabilities

## Support

For issues specific to:
- **Zypher Agent**: Check [JSR @zypher/agent](https://jsr.io/@zypher/agent)
- **Railway**: Visit [Railway Docs](https://docs.railway.app)
- **This App**: Create an issue in the repository
