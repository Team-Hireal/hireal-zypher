/**
 * Test file for Wayback Machine utilities
 * Run with: deno run --allow-net utils/waybackMachine.test.ts
 */

import {
  checkWaybackAvailability,
  compareSnapshots,
  formatWaybackTimestamp,
  getNewestSnapshot,
  getOldestSnapshot,
  isUrlArchived,
} from "./waybackMachine.ts";

async function testCheckAvailability() {
  console.log("\n=== Testing checkWaybackAvailability ===");

  const result = await checkWaybackAvailability("example.com");
  console.log("Result for example.com:", JSON.stringify(result, null, 2));

  if (result.available) {
    console.log("✓ URL is archived");
    console.log("  Snapshot URL:", result.url);
    console.log("  Timestamp:", result.timestamp);
    console.log("  Formatted:", formatWaybackTimestamp(result.timestamp || ""));
  } else {
    console.log("✗ URL is not archived");
  }
}

async function testOldestAndNewest() {
  console.log("\n=== Testing getOldestSnapshot and getNewestSnapshot ===");

  const oldest = await getOldestSnapshot("example.com");
  console.log("Oldest snapshot:", JSON.stringify(oldest, null, 2));

  const newest = await getNewestSnapshot("example.com");
  console.log("Newest snapshot:", JSON.stringify(newest, null, 2));
}

async function testCompareSnapshots() {
  console.log("\n=== Testing compareSnapshots ===");

  const comparison = await compareSnapshots("example.com");
  console.log("Comparison result:", JSON.stringify(comparison, null, 2));

  if (comparison.hasChanges) {
    console.log("✓ URL has changed over time");
  } else {
    console.log("✗ No changes detected or insufficient data");
  }
}

async function testIsUrlArchived() {
  console.log("\n=== Testing isUrlArchived ===");

  const archived = await isUrlArchived("example.com");
  console.log("Is example.com archived?", archived);

  const notArchived = await isUrlArchived("this-domain-definitely-does-not-exist-12345.com");
  console.log("Is fake domain archived?", notArchived);
}

async function runTests() {
  console.log("Starting Wayback Machine utility tests...");

  try {
    await testCheckAvailability();
    await testOldestAndNewest();
    await testCompareSnapshots();
    await testIsUrlArchived();

    console.log("\n✓ All tests completed successfully!");
  } catch (error) {
    console.error("\n✗ Test failed:", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  runTests();
}