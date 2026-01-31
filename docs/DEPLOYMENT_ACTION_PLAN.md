# Deployment Action Plan - Monorepo on Vercel with Deno Server

## ✅ Completed Actions

### 1. Created Vercel Configuration (`vercel.json`)
- Configured Next.js framework
- Set up Deno runtime for serverless functions in `api/` directory
- Added rewrites for Deno endpoints

### 2. Created Deno Serverless Functions
- **`api/research.ts`**: Main research endpoint using Deno runtime
  - Handles research queries using `@zypher/agent`
  - Streams responses via Server-Sent Events (SSE)
  - Uses shared utilities from `utils/` directory
  
- **`api/health-deno.ts`**: Health check endpoint for Deno functions

### 3. Updated Next.js API Routes
- **`app/api/research/route.ts`**: 
  - Detects Vercel environment
  - On Vercel: Proxies to Deno serverless functions
  - Local: Proxies to external Deno server (for development)

### 4. Created Deployment Documentation
- **`VERCEL_MONOREPO_DEPLOY.md`**: Comprehensive deployment guide
  - Architecture overview
  - Step-by-step deployment instructions
  - Environment variables setup
  - Troubleshooting guide
  - Local development setup

## 📋 Architecture

```
┌─────────────────────────────────────────┐
│         Vercel Platform                 │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────┐                    │
│  │  Next.js App   │                    │
│  │  (Frontend)    │                    │
│  └────────┬────────┘                    │
│           │                               │
│           │ /api/research                │
│           ▼                               │
│  ┌─────────────────┐                    │
│  │ Next.js Route  │                    │
│  │ (app/api/...)  │                    │
│  └────────┬────────┘                    │
│           │                               │
│           │ Proxies to                  │
│           ▼                               │
│  ┌─────────────────┐                    │
│  │ Deno Function  │                    │
│  │ (api/research) │                    │
│  │ Runtime: Deno  │                    │
│  └─────────────────┘                    │
│                                         │
└─────────────────────────────────────────┘
```

## 🚀 Deployment Steps

### Step 1: Push to Git
```bash
git add .
git commit -m "Add Vercel monorepo deployment configuration"
git push
```

### Step 2: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com)
2. Import your Git repository
3. Vercel will auto-detect Next.js

### Step 3: Configure Environment Variables
Add these in Vercel project settings:
- `ANTHROPIC_API_KEY` - Your Anthropic API key
- `FIRECRAWL_API_KEY` - Your Firecrawl API key

### Step 4: Deploy
Click "Deploy" and wait for build to complete.

## 🔧 Key Configuration Files

### `vercel.json`
- Configures Deno runtime for `api/**/*.ts` files
- Sets up rewrites for Deno endpoints
- Configures Next.js framework

### `deno.json`
- Defines JSR imports (`@zypher/agent`)
- Configures Deno tasks for local development

### `api/research.ts`
- Deno serverless function
- Uses `@zypher/agent` from JSR
- Imports shared utilities from `utils/`

## 📝 Important Notes

1. **Monorepo Structure**: Both frontend and backend are in the same repository
2. **Deno Runtime**: Serverless functions use Deno runtime (not Node.js)
3. **JSR Packages**: `@zypher/agent` works natively with Deno runtime
4. **Environment Detection**: Code automatically detects Vercel vs local environment
5. **SSE Streaming**: Uses Server-Sent Events (works on Vercel, unlike WebSockets)

## 🧪 Testing

### Local Development
```bash
# Terminal 1: Deno Server
deno task server

# Terminal 2: Next.js Frontend
npm run dev
```

### Production (Vercel)
- Frontend: `https://your-project.vercel.app`
- Health Check: `https://your-project.vercel.app/api/health`
- Research API: `https://your-project.vercel.app/api/research`

## ⚠️ Potential Issues & Solutions

### Issue: Deno Runtime Not Available
**Solution**: Ensure `vercel.json` has correct Deno runtime configuration. Vercel Pro may be required for Deno runtime.

### Issue: Import Path Errors
**Solution**: Verify relative paths (`../utils/`) are correct from `api/` directory.

### Issue: Environment Variables Not Working
**Solution**: 
- Check variables are set in Vercel dashboard
- Redeploy after adding variables
- Verify variable names match exactly

### Issue: Function Timeout
**Solution**: 
- Upgrade to Vercel Pro (60s timeout)
- Optimize agent tasks
- Break long tasks into chunks

## 📚 Next Steps

1. **Test Deployment**: Deploy to Vercel and test all endpoints
2. **Monitor Logs**: Check Vercel function logs for errors
3. **Optimize**: Review function execution times
4. **Scale**: Consider Pro plan for longer timeouts if needed

## 🔗 Resources

- [Vercel Deno Runtime Docs](https://vercel.com/docs/functions/runtimes/deno)
- [Vercel Monorepo Guide](https://vercel.com/docs/monorepos)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

