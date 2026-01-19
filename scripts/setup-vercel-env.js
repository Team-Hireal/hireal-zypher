#!/usr/bin/env node

/**
 * Script to help set up Vercel environment variables
 * 
 * IMPORTANT: DENO_SERVER_URL is NO LONGER REQUIRED on Vercel!
 * The code has been updated to use Vercel Deno serverless functions automatically.
 * 
 * You only need to set:
 *   - ANTHROPIC_API_KEY (required)
 *   - FIRECRAWL_API_KEY (required)
 * 
 * Usage:
 *   1. Via Vercel Dashboard (Recommended):
 *      - Go to https://vercel.com/dashboard
 *      - Select your project
 *      - Go to Settings > Environment Variables
 *      - Add ANTHROPIC_API_KEY and FIRECRAWL_API_KEY for Production, Preview, and Development
 * 
 *   2. Via Vercel CLI:
 *      vercel env add ANTHROPIC_API_KEY production
 *      vercel env add ANTHROPIC_API_KEY preview
 *      vercel env add ANTHROPIC_API_KEY development
 *      
 *      vercel env add FIRECRAWL_API_KEY production
 *      vercel env add FIRECRAWL_API_KEY preview
 *      vercel env add FIRECRAWL_API_KEY development
 */

console.log('🚀 Vercel Environment Variables Setup Guide\n');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('✅ GOOD NEWS: DENO_SERVER_URL is NO LONGER REQUIRED!\n');
console.log('The code has been updated to automatically use Vercel Deno');
console.log('serverless functions. You don\'t need to deploy a separate');
console.log('Deno server or set DENO_SERVER_URL.\n');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('Required Environment Variables:\n');
console.log('  1. ANTHROPIC_API_KEY');
console.log('     - Get one at: https://console.anthropic.com/');
console.log('     - Format: sk-ant-...\n');
console.log('  2. FIRECRAWL_API_KEY');
console.log('     - Get one at: https://www.firecrawl.dev/');
console.log('     - Format: fc-...\n');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('How to Set Environment Variables:\n');
console.log('Option 1: Via Vercel Dashboard (Easiest)\n');
console.log('  1. Go to https://vercel.com/dashboard');
console.log('  2. Select your project');
console.log('  3. Go to Settings > Environment Variables');
console.log('  4. Click "Add New" for each variable');
console.log('  5. Set for: Production, Preview, and Development');
console.log('  6. Click "Save"');
console.log('  7. Redeploy your project\n');
console.log('Option 2: Via Vercel CLI\n');
console.log('  Make sure Vercel CLI is installed:');
console.log('    npm i -g vercel');
console.log('    vercel login\n');
console.log('  Then run these commands (you\'ll be prompted for values):');
console.log('    vercel env add ANTHROPIC_API_KEY production');
console.log('    vercel env add ANTHROPIC_API_KEY preview');
console.log('    vercel env add ANTHROPIC_API_KEY development');
console.log('');
console.log('    vercel env add FIRECRAWL_API_KEY production');
console.log('    vercel env add FIRECRAWL_API_KEY preview');
console.log('    vercel env add FIRECRAWL_API_KEY development\n');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('After setting environment variables:\n');
console.log('  1. Go to your Vercel project dashboard');
console.log('  2. Click "Redeploy" or push a new commit');
console.log('  3. The deployment will use the new environment variables\n');
console.log('═══════════════════════════════════════════════════════════\n');
console.log('Troubleshooting:\n');
console.log('  - If you see "DENO_SERVER_URL is required" error:');
console.log('    This should be fixed now. Make sure you\'ve pulled the latest code.');
console.log('  - If API calls fail:');
console.log('    Check that ANTHROPIC_API_KEY and FIRECRAWL_API_KEY are set correctly.');
console.log('  - Check deployment logs:');
console.log('    Go to Vercel dashboard > Your Project > Deployments > View Logs\n');

