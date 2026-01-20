// Health check endpoint for Deno serverless function
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  // Only allow GET
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...CORS, "Content-Type": "application/json" },
      },
    );
  }

  return new Response(
    JSON.stringify({
      status: "ok",
      runtime: "deno",
      timestamp: new Date().toISOString(),
    }),
    {
      headers: { ...CORS, "Content-Type": "application/json" },
    },
  );
}

