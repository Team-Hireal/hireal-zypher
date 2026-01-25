import { NextRequest } from "next/server";

const DENO_SERVER_URL = process.env.DENO_SERVER_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { personName } = body;

    if (!personName || typeof personName !== "string") {
      return new Response(
        JSON.stringify({ error: "personName is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.log(`[API] Proxying request to Deno server: "${personName}"`);

    const denoResponse = await fetch(`${DENO_SERVER_URL}/api/research`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ personName }),
    });

    if (!denoResponse.ok) {
      const errorText = await denoResponse.text();
      throw new Error(errorText || `Server error: ${denoResponse.status}`);
    }

    if (!denoResponse.body) {
      throw new Error('Response body is null');
    }

    return new Response(denoResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error(`[API] Error:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}