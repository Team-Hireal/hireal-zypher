# Vercel Deployment Guide

This guide will help you deploy the Hireal Zypher project to Vercel.

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

- `ANTHROPIC_API_KEY` - Your Anthropic API key (starts with `sk-ant-`)
- `FIRECRAWL_API_KEY` - Your Firecrawl API key

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

### 5. Deploy

1. Click "Deploy" in the Vercel dashboard
2. Wait for the build to complete
3. Your app will be live at `https://your-project.vercel.app`

## Important Notes

### JSR Package Support

This project uses `@zypher/agent` from JSR (JavaScript Registry). The package is specified in `package.json` as `"@zypher/agent": "jsr:@zypher/agent@^0.7.3"`.

**Important**: If the build fails because npm cannot install the JSR package, you have a few options:

1. **Check if the package is available on npm**: Some JSR packages are also published to npm. Try:
   ```bash
   npm install @zypher/agent
   ```
   Then update the import in `app/api/research/route.ts` if needed.

2. **Use a custom install script**: Create a `vercel.json` with a custom install command:
   ```json
   {
     "installCommand": "npm install && deno install --allow-all || true"
   }
   ```

3. **Use Deno runtime on Vercel**: Vercel supports Deno runtime (may require Pro plan). You would need to:
   - Configure the project to use Deno
   - Keep the original `server.ts` approach
   - Use Vercel's Deno runtime configuration

4. **Alternative**: If the package is not compatible with Node.js, consider:
   - Running the agent as a separate service
   - Using Vercel's Edge Functions if supported
   - Contacting the Zypher team for Node.js compatibility

**Note**: The current setup assumes the JSR package can work with Node.js/npm. If it doesn't, you'll need to adjust the approach.

### WebSocket Support

WebSocket connections are **not supported** on Vercel's serverless functions. The application automatically falls back to Server-Sent Events (SSE), which works perfectly on Vercel.

### Function Timeout

Vercel has function timeout limits:
- Hobby plan: 10 seconds (for API routes)
- Pro plan: 60 seconds
- Enterprise: Custom limits

For long-running research tasks, consider:
- Using Vercel Pro plan for longer timeouts
- Implementing a queue system with background jobs
- Using Vercel Edge Functions for better performance

## Troubleshooting

### Build Fails with "@zypher/agent" Error

If the build fails because `@zypher/agent` can't be installed:

1. Check if the package is available on npm
2. Consider using a different package manager or build setup
3. Contact Vercel support for JSR package compatibility

### Environment Variables Not Working

- Ensure variables are set for the correct environment (Production/Preview/Development)
- Redeploy after adding new environment variables
- Check variable names match exactly (case-sensitive)

### API Routes Timeout

- Upgrade to Vercel Pro for longer timeouts
- Optimize agent tasks to complete faster
- Consider breaking long tasks into smaller chunks

## Post-Deployment

After deployment:

1. Test the `/api/health` endpoint: `https://your-project.vercel.app/api/health`
2. Test the research functionality with a simple query
3. Monitor Vercel logs for any errors
4. Set up custom domain (optional) in project settings

## Local Development

For local development, create a `.env` file in the root directory:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
FIRECRAWL_API_KEY=your-firecrawl-api-key-here
PORT=8000
```

Then run:
```bash
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

