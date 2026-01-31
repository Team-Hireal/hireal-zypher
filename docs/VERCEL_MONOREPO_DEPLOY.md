# Vercel Monorepo Deployment Guide

This guide explains how to deploy both the Next.js frontend and Deno backend as a monorepo on Vercel.

## Architecture Overview

The project is structured as a monorepo with:
- **Frontend**: Next.js application (React) in `app/` directory
- **Backend**: Deno serverless functions in `api/` directory (root level)
- **Shared**: Utilities and types shared between frontend and backend

## Project Structure

```
hireal-zypher/
├── app/                    # Next.js frontend
│   ├── api/               # Next.js API routes (proxies to Deno functions on Vercel)
│   └── ...
├── api/                    # Deno serverless functions (Vercel)
│   ├── research.ts        # Research endpoint (Deno runtime)
│   └── health-deno.ts     # Health check (Deno runtime)
├── components/            # React components
├── utils/                 # Shared utilities
├── vercel.json            # Vercel configuration
├── deno.json              # Deno configuration
└── package.json           # Node.js dependencies
```

## Prerequisites

1. A Vercel account ([sign up here](https://vercel.com))
2. A Git repository (GitHub, GitLab, or Bitbucket)
3. API keys:
   - Anthropic API key ([get one here](https://console.anthropic.com/))
   - Firecrawl API key ([get one here](https://www.firecrawl.dev/))

## Deployment Steps

### 1. Push Your Code to Git

Make sure your code is pushed to a Git repository (GitHub, GitLab, or Bitbucket).

### 2. Import Project to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New..." → "Project"
3. Import your Git repository
4. Vercel will auto-detect Next.js

### 3. Configure Environment Variables

In the Vercel project settings, add the following environment variables:

**Required:**
- `ANTHROPIC_API_KEY` - Your Anthropic API key (starts with `sk-ant-`)
- `FIRECRAWL_API_KEY` - Your Firecrawl API key

**Optional (for local development):**
- `DENO_SERVER_URL` - Only needed if running a separate Deno server locally (defaults to `http://localhost:8000`)

**To add environment variables:**
1. Go to your project settings in Vercel
2. Navigate to "Environment Variables"
3. Add each variable for all environments (Production, Preview, Development)

### 4. Configure Build Settings

Vercel should auto-detect Next.js, but verify these settings:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (or `next build`)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install`
- **Root Directory**: `/` (root of monorepo)

### 5. Deno Runtime Configuration

The `vercel.json` file configures Deno runtime for serverless functions:

```json
{
  "functions": {
    "api/**/*.ts": {
      "runtime": "deno@1.40.0"
    }
  }
}
```

This ensures all TypeScript files in the `api/` directory run with Deno runtime.

### 6. Deploy

1. Click "Deploy" in the Vercel dashboard
2. Wait for the build to complete
3. Your app will be live at `https://your-project.vercel.app`

## How It Works

### On Vercel (Production)

1. **Next.js Frontend**: Serves the React application
2. **Next.js API Routes** (`app/api/research/route.ts`): 
   - Detects Vercel environment
   - Proxies requests to Deno serverless functions
3. **Deno Serverless Functions** (`api/research.ts`):
   - Run with Deno runtime
   - Handle the actual research logic using `@zypher/agent`
   - Stream responses back via Server-Sent Events (SSE)

### Local Development

1. **Next.js Frontend**: Run with `npm run dev` (port 3000)
2. **Deno Server**: Run separately with `deno task server` (port 8000)
3. **Next.js API Routes**: Proxy to local Deno server at `http://localhost:8000`

## Endpoints

### Frontend
- `/` - Main application UI
- `/api/research` - Research endpoint (Next.js route, proxies to Deno function on Vercel)
- `/api/health` - Health check (Next.js route)

### Backend (Deno Serverless Functions)
- `/api/research-deno` - Research endpoint (Deno runtime)
- `/api/health-deno` - Health check (Deno runtime)

## Important Notes

### Deno Runtime Support

Vercel supports Deno runtime for serverless functions. The configuration in `vercel.json` ensures:
- Files in `api/**/*.ts` use Deno runtime
- JSR packages (like `@zypher/agent`) work correctly
- Deno-specific APIs are available

### JSR Package Support

This project uses `@zypher/agent` from JSR (JavaScript Registry). The package is specified in `deno.json`:

```json
{
  "imports": {
    "@zypher/agent": "jsr:@zypher/agent@^0.7.3"
  }
}
```

Vercel's Deno runtime automatically handles JSR packages, so no additional configuration is needed.

### WebSocket Support

WebSocket connections are **not supported** on Vercel's serverless functions. The application uses Server-Sent Events (SSE), which works perfectly on Vercel.

### Function Timeout

Vercel has function timeout limits:
- Hobby plan: 10 seconds (for API routes)
- Pro plan: 60 seconds
- Enterprise: Custom limits

For long-running research tasks, consider:
- Using Vercel Pro plan for longer timeouts
- Implementing a queue system with background jobs
- Optimizing agent tasks to complete faster

### Monorepo Benefits

Deploying as a monorepo provides:
- Single deployment pipeline
- Shared code between frontend and backend
- Simplified environment variable management
- Unified logging and monitoring

## Troubleshooting

### Build Fails with Deno Runtime Error

If the build fails with Deno-related errors:

1. Verify `vercel.json` has the correct Deno runtime configuration
2. Check that `deno.json` exists and has correct imports
3. Ensure all Deno dependencies are specified in `deno.json`

### Environment Variables Not Working

- Ensure variables are set for the correct environment (Production/Preview/Development)
- Redeploy after adding new environment variables
- Check variable names match exactly (case-sensitive)
- Verify variables are accessible in Deno functions (they should be via `Deno.env.get()`)

### API Routes Timeout

- Upgrade to Vercel Pro for longer timeouts (60 seconds)
- Optimize agent tasks to complete faster
- Consider breaking long tasks into smaller chunks
- Monitor function execution time in Vercel dashboard

### Deno Serverless Functions Not Found

- Verify files are in `api/` directory (root level, not `app/api/`)
- Check `vercel.json` has correct function configuration
- Ensure file extensions are `.ts` (not `.tsx` or `.js`)
- Review Vercel build logs for deployment errors

### Local Development Issues

If local development doesn't work:

1. Start Deno server: `deno task server`
2. Start Next.js dev server: `npm run dev`
3. Verify `DENO_SERVER_URL` is not set (or set to `http://localhost:8000`)
4. Check that both servers are running on correct ports

## Post-Deployment

After deployment:

1. Test the `/api/health` endpoint: `https://your-project.vercel.app/api/health`
2. Test the research functionality with a simple query
3. Monitor Vercel logs for any errors
4. Set up custom domain (optional) in project settings
5. Configure monitoring and alerts in Vercel dashboard

## Local Development Setup

For local development, create a `.env` file in the root directory:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
FIRECRAWL_API_KEY=your-firecrawl-api-key-here
PORT=8000
# Optional: only set this if you want the frontend to hit a deployed Deno host instead of your local one.
# DENO_SERVER_URL=http://localhost:8000
```

Then run:

**Terminal 1 - Deno Server:**
```bash
deno task server
```

**Terminal 2 - Next.js Frontend:**
```bash
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Deno Runtime](https://vercel.com/docs/functions/runtimes/deno)
- [Next.js Documentation](https://nextjs.org/docs)
- [Deno Documentation](https://deno.land/docs)

