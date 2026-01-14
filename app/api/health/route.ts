import { NextResponse } from "next/server";

const DENO_SERVER_URL = process.env.DENO_SERVER_URL || 'http://localhost:8000';

export async function GET() {
  try {
    // Check if Deno server is running
    const response = await fetch(`${DENO_SERVER_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    if (response.ok) {
      return NextResponse.json({ 
        status: "ok",
        denoServer: "connected"
      });
    } else {
      return NextResponse.json({ 
        status: "ok",
        denoServer: "error",
        error: `Deno server returned status ${response.status}`
      }, { status: 503 });
    }
  } catch (error) {
    // Deno server is not running or not reachable
    return NextResponse.json({ 
      status: "ok",
      denoServer: "disconnected",
      error: error instanceof Error ? error.message : "Cannot connect to Deno server"
    }, { status: 503 });
  }
}

