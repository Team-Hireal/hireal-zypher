# Quick Start Guide

## The Error You're Seeing

If you see errors like:
- `Failed to load resource: net::ERR_CONNECTION_REFUSED`
- `404 (Not Found)` for `/api/research`

This means the **backend server is not running**. You need to start it first!

## Solution: Start the Backend Server

### Step 1: Open a Terminal

Open a new terminal window/tab (keep your Next.js dev server running in the other terminal).

### Step 2: Navigate to Project Directory

```bash
cd /Users/test/Desktop/Hireal/hireal-zypher
```

### Step 3: Start the Deno Server

```bash
deno task server
```

You should see:
```
🚀 Zypher Agent Server running on http://localhost:8000
```

### Step 4: Verify It's Working

The frontend will automatically detect when the server is connected. You should see the error message disappear.

## Running Both Servers

You need **two terminals** running simultaneously:

**Terminal 1 - Backend (Deno):**
```bash
cd /Users/test/Desktop/Hireal/hireal-zypher
deno task server
```

**Terminal 2 - Frontend (Next.js):**
```bash
cd /Users/test/Desktop/Hireal/hireal-zypher
npm run dev
```

## Troubleshooting

### Server won't start?

1. **Check your `.env` file exists** and has your API keys:
   ```bash
   cat .env
   ```

2. **Make sure Deno is installed:**
   ```bash
   deno --version
   ```

3. **Check if port 8000 is already in use:**
   ```bash
   lsof -i :8000
   ```
   If something is using it, either stop that process or change the PORT in `.env`

### Still having issues?

Check the server terminal for error messages. Common issues:
- Missing API keys in `.env`
- Firecrawl MCP server connection issues
- Network/firewall blocking port 8000

