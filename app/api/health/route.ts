import { NextResponse } from "next/server";
import { resolveDenoServerUrl } from "@/utils/denoServer";

// Check if we're on Vercel (runtime or build)
const isVercel = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
const isVercelBuild = process.env.CI === "true" || (isVercel && process.env.VERCEL_ENV === "production");

export async function GET() {
  // On Vercel, use Deno serverless functions - no need for external DENO_SERVER_URL
  if (isVercel) {
    // During build, just return success
    if (isVercelBuild) {
      console.log('[Health] Vercel build environment - Deno serverless functions will be available at runtime');
      return NextResponse.json({
        status: "ok",
        denoServer: "available",
        runtime: "vercel-serverless",
        environment: "build"
      });
    }
    
    // At runtime on Vercel, serverless functions are available
    console.log('[Health] Vercel runtime - using Deno serverless functions');
    return NextResponse.json({
      status: "ok",
      denoServer: "available",
      runtime: "vercel-serverless",
      note: "DENO_SERVER_URL not required - using Vercel Deno serverless functions"
    });
  }

  let denoServerUrl: string;
  try {
    denoServerUrl = resolveDenoServerUrl();
  } catch (error) {
    console.log("[Health] Deno server configuration missing:", error);
    return NextResponse.json(
      {
        status: "ok",
        denoServer: "not_configured",
        error: error instanceof Error ? error.message : "DENO_SERVER_URL is required",
      },
      { status: 500 },
    );
  }

  // Skip health check if using Vercel serverless placeholder
  if (denoServerUrl === "vercel-serverless") {
    return NextResponse.json({
      status: "ok",
      denoServer: "available",
      runtime: "vercel-serverless"
    });
  }

  try {
    console.log(`[Health] Checking Deno server at: ${denoServerUrl}/health`);

    // Check if Deno server is running
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${denoServerUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log('[Health] Deno server connected successfully');
      return NextResponse.json({
        status: "ok",
        denoServer: "connected"
      });
    } else {
      console.log(`[Health] Deno server returned status ${response.status}`);
      return NextResponse.json({
        status: "ok",
        denoServer: "error",
        error: `Deno server returned status ${response.status}`
      }, { status: 503 });
    }
  } catch (error) {
    console.log('[Health] Error connecting to Deno server:', error);
    // Deno server is not running or not reachable
    return NextResponse.json({
      status: "ok",
      denoServer: "disconnected",
      error: error instanceof Error ? error.message : "Cannot connect to Deno server"
    }, { status: 503 });
  }
}

