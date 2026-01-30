#!/usr/bin/env -S deno run --allow-net --allow-run

/**
 * Test the Wayback Machine MCP server
 */

async function testMCPServer() {
  console.log("Starting MCP server test...\n");

  const process = new Deno.Command("deno", {
    args: ["run", "--allow-net", "--allow-env", "./mcp-servers/wayback-server.ts"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Test 1: Initialize
  console.log("Test 1: Initialize");
  const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {},
  };
  await process.stdin.getWriter().write(encoder.encode(JSON.stringify(initRequest) + "\n"));

  // Test 2: List tools
  console.log("Test 2: List tools");
  const listRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
  };
  await process.stdin.getWriter().write(encoder.encode(JSON.stringify(listRequest) + "\n"));

  // Test 3: Call check_wayback_availability
  console.log("Test 3: Call check_wayback_availability");
  const callRequest = {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "check_wayback_availability",
      arguments: {
        url: "example.com",
      },
    },
  };
  await process.stdin.getWriter().write(encoder.encode(JSON.stringify(callRequest) + "\n"));

  // Wait a bit for responses
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Close stdin to signal we're done
  await process.stdin.close();

  // Read output
  const output = await process.stdout.getReader().read();
  if (output.value) {
    console.log("\nServer output:");
    console.log(decoder.decode(output.value));
  }

  // Read stderr
  const stderr = await process.stderr.getReader().read();
  if (stderr.value) {
    console.log("\nServer stderr:");
    console.log(decoder.decode(stderr.value));
  }

  // Wait for process to finish
  const status = await process.status;
  console.log("\nProcess exited with code:", status.code);
}

if (import.meta.main) {
  testMCPServer();
}