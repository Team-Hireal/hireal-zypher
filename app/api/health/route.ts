import { NextResponse } from "next/server";
import { resolveDenoServerUrl } from "@/utils/denoServer";

// Check if we're in a Vercel build/static generation environment
const isVercelBuild =
  process.env.VERCEL === "1" ||
  process.env.CI === "true" ||
  Boolean(process.env.VERCEL_ENV);

export async function GET() {
  // In Vercel build environment, return success without checking Deno server
  // The Deno server runs separately and won't be available during build
  if (isVercelBuild) {
    console.log('[Health] Vercel build environment detected - skipping Deno server check');
    return NextResponse.json({
      status: "ok",
      denoServer: "not_checked",
      environment: "vercel_build"
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

