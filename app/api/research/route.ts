import { NextRequest } from "next/server";
import { resolveDenoServerUrl } from "@/utils/denoServer";

// Check if we're on Vercel (where Deno serverless functions are available)
const isVercel = process.env.VERCEL === "1";

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

    // On Vercel, use Deno serverless functions directly
    if (isVercel) {
      const protocol = request.headers.get("x-forwarded-proto") || "https";
      const host = request.headers.get("host") || "";
      const baseUrl = `${protocol}://${host}`;
      const denoFunctionUrl = `${baseUrl}/api/research-deno`;
      
      console.log(
        `[API] Proxying to Deno serverless function at ${denoFunctionUrl}: "${personName}"`,
      );

      try {
        const denoResponse = await fetch(denoFunctionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ personName }),
        });

        if (!denoResponse.ok) {
          const errorText = await denoResponse.text();
          let errorMessage = `Deno serverless function responded with status ${denoResponse.status}`;
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch {
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        if (!denoResponse.body) {
          throw new Error("Deno serverless function response body is null");
        }

        return new Response(denoResponse.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });
      } catch (fetchError) {
        console.error(`[API] Error calling Deno serverless function:`, fetchError);
        throw fetchError;
      }
    }

    // Local development: proxy to external Deno server
    const denoServerUrl = resolveDenoServerUrl();
    console.log(
      `[API] Proxying request to Deno server at ${denoServerUrl}: "${personName}"`,
    );

    // Proxy the request to the Deno server
    try {
      const denoResponse = await fetch(`${denoServerUrl}/api/research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ personName }),
      });

      if (!denoResponse.ok) {
        const errorText = await denoResponse.text();
        let errorMessage = `Deno server responded with status ${denoResponse.status}`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        // Check for stub module error in the response
        const errorLower = errorMessage.toLowerCase();
        if (errorLower.includes("@zypher/agent requires deno runtime") || 
            errorLower.includes("stub module")) {
          errorMessage = 
            `❌ Deno Server Error: Stub Module Detected\n\n` +
            `The Deno server is using a stub module instead of the real @zypher/agent package.\n\n` +
            `This means the Deno server is not properly configured. Please:\n` +
            `1. Make sure you're running the server with: deno task server\n` +
            `2. Verify @zypher/agent is installed: deno add jsr:@zypher/agent\n` +
            `3. Check that the server is running in a Deno environment\n\n` +
            `Original error: ${errorMessage}`;
        }
        
        throw new Error(errorMessage);
      }

      if (!denoResponse.body) {
        throw new Error('Deno server response body is null');
      }

      // Return the stream from Deno server
      return new Response(denoResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
    } catch (fetchError) {
      console.error(`[API] Error connecting to Deno server:`, fetchError);
      
      // Check if it's a connection error
      if (fetchError instanceof TypeError &&
          (fetchError.message.includes('fetch') ||
           fetchError.message.includes('ECONNREFUSED') ||
           fetchError.message.includes('Failed to fetch'))) {
        throw new Error(
          `❌ Cannot connect to Deno server\n\n` +
          `The Deno server is not running or not reachable at ${denoServerUrl}.\n\n` +
          `Please start the Deno server in a separate terminal:\n` +
          `  deno task server\n\n` +
          `Or if the server is running on a different URL, set the DENO_SERVER_URL environment variable.`
        );
      }
      throw fetchError;
    }
  } catch (error) {
    // Log the full error for debugging
    console.error(`[API] Error in POST handler:`, error);
    if (error instanceof Error) {
      console.error(`[API] Error stack:`, error.stack);
    }
    
    // Check for authentication errors
    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message);
    } else {
      errorMessage = "Unknown error occurred";
    }
    
    const errorStr = errorMessage.toLowerCase();
    let statusCode = 500;
    
    // Check for stub module error (indicates Deno server is not running properly)
    if (errorStr.includes("@zypher/agent requires deno runtime") || 
        errorStr.includes("stub module") ||
        errorStr.includes("not function correctly in node.js")) {
      errorMessage = 
        `❌ Deno Server Configuration Error\n\n` +
        `The Deno server appears to be using a stub module instead of the real @zypher/agent package.\n\n` +
        `This usually means:\n` +
        `1. The Deno server is not running, OR\n` +
        `2. The Deno server is running in the wrong environment\n\n` +
        `Please ensure:\n` +
        `1. Start the Deno server with: deno task server\n` +
        `2. The server is running in a Deno environment (not Node.js)\n` +
        `3. The @zypher/agent package is installed via: deno add jsr:@zypher/agent\n\n` +
        `Original error: ${errorMessage}`;
      statusCode = 503; // Service Unavailable
    } else if (errorStr.includes("authentication") || 
        errorStr.includes("api-key") || 
        errorStr.includes("invalid x-api-key") ||
        errorStr.includes("401") ||
        (errorStr.includes("environment variable") && errorStr.includes("not set"))) {
      statusCode = 401;
      if (errorStr.includes("not set") || errorStr.includes("empty")) {
        errorMessage = 
          `❌ Missing API Key\n\n` +
          `The ANTHROPIC_API_KEY environment variable is not set.\n` +
          `Please:\n` +
          `1. Create a .env file in the project root\n` +
          `2. Add: ANTHROPIC_API_KEY=sk-ant-your-key-here\n` +
          `3. Get a key at: https://console.anthropic.com/\n` +
          `4. Restart the server\n\n` +
          `Original error: ${errorMessage}`;
      } else {
        errorMessage = 
          `❌ Authentication Error: Invalid API Key\n\n` +
          `Your ANTHROPIC_API_KEY appears to be invalid or expired.\n` +
          `Please:\n` +
          `1. Check your .env file has a valid key\n` +
          `2. Get a new key at: https://console.anthropic.com/\n` +
          `3. Restart the server after updating the key\n\n` +
          `Original error: ${errorMessage}`;
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        type: statusCode === 401 ? "authentication_error" : "server_error"
      }),
      {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

