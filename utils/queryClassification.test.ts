#!/usr/bin/env -S deno run --allow-net

/**
 * Test query classification to ensure task-based queries trigger research workflow
 */

// Copy of the isResearchQuery function from server.ts
function isResearchQuery(query: string): boolean {
  const q = query.trim();

  // Exclude simple greetings and acknowledgments
  if (/^(hi|hello|hey|thanks?|yes|no|ok|help)[\s!.,]*$/i.test(q)) return false;
  if (/^(who are you|what can you do)/i.test(q)) return false;

  // Task-based action verbs - these indicate the user wants something done
  if (/(research|find|search|analyze|compare|verify|check|investigate|examine|review|assess|evaluate|show|get|retrieve|fetch|list|identify|track|monitor|audit|validate)/i.test(q))
    return true;

  // Information requests
  if (/(tell me about|information about|who is|what is|details about|background on)/i.test(q))
    return true;

  // Website and archive-related queries
  if (/(website|site|domain|url|web|archive|wayback|snapshot|changes|history|evolution|timeline)/i.test(q))
    return true;

  // Due diligence and verification keywords
  if (/(due diligence|background|profile|credentials|verification|validate|confirm)/i.test(q))
    return true;

  // Comparison and analysis
  if (/(difference|vs|versus|between|compare|contrast)/i.test(q))
    return true;

  // Contains a URL or domain pattern
  if (/\b[a-z0-9-]+\.(com|org|net|io|ai|co|dev|app|tech)\b/i.test(q))
    return true;

  // Person name pattern (capitalized words)
  if (/[A-Z][a-z]+(\s*\([A-Za-z]+\))?\s+[A-Z][a-z]+/.test(q))
    return true;

  // Default to non-research for everything else
  return false;
}

// Test cases
const testCases = [
  // Should trigger research (true)
  { query: "analyze changes to skyrisai.com", expected: true, category: "Website analysis" },
  { query: "Could you tell me the changes made to skyrisai.com?", expected: true, category: "Website changes" },
  { query: "Analyze change in text and layout", expected: true, category: "Analysis task" },
  { query: "Who is Simon Jiahe Tian?", expected: true, category: "Person research" },
  { query: "research John Doe", expected: true, category: "Research task" },
  { query: "find information about Tesla", expected: true, category: "Information request" },
  { query: "compare example.com and test.com", expected: true, category: "Comparison" },
  { query: "verify credentials of Jane Smith", expected: true, category: "Verification" },
  { query: "check the history of google.com", expected: true, category: "History check" },
  { query: "investigate the background of this company", expected: true, category: "Investigation" },
  { query: "show me the profile of Alice Johnson", expected: true, category: "Profile request" },
  { query: "what is the difference between v1 and v2", expected: true, category: "Comparison" },
  { query: "get the timeline of events", expected: true, category: "Timeline request" },
  { query: "review the website changes", expected: true, category: "Review task" },
  { query: "assess the credentials", expected: true, category: "Assessment" },
  { query: "examine the domain history", expected: true, category: "Examination" },
  { query: "monitor changes to the site", expected: true, category: "Monitoring" },
  { query: "validate the information", expected: true, category: "Validation" },
  { query: "due diligence on the company", expected: true, category: "Due diligence" },
  { query: "background check on the person", expected: true, category: "Background check" },
  { query: "visit example.com", expected: true, category: "URL mention" },
  { query: "check openai.com", expected: true, category: "Domain check" },
  { query: "what about test.io", expected: true, category: "Domain question" },

  // Should NOT trigger research (false)
  { query: "hi", expected: false, category: "Greeting" },
  { query: "hello", expected: false, category: "Greeting" },
  { query: "thanks", expected: false, category: "Acknowledgment" },
  { query: "yes", expected: false, category: "Confirmation" },
  { query: "no", expected: false, category: "Negation" },
  { query: "ok", expected: false, category: "Acknowledgment" },
  { query: "who are you", expected: false, category: "Identity question" },
  { query: "what can you do", expected: false, category: "Capability question" },
];

console.log("Testing Query Classification\n");
console.log("=" .repeat(80));

let passed = 0;
let failed = 0;

for (const test of testCases) {
  const result = isResearchQuery(test.query);
  const status = result === test.expected ? "✓ PASS" : "✗ FAIL";
  const color = result === test.expected ? "\x1b[32m" : "\x1b[31m";
  const reset = "\x1b[0m";

  if (result === test.expected) {
    passed++;
  } else {
    failed++;
  }

  console.log(`${color}${status}${reset} [${test.category}]`);
  console.log(`  Query: "${test.query}"`);
  console.log(`  Expected: ${test.expected}, Got: ${result}`);
  console.log();
}

console.log("=" .repeat(80));
console.log(`\nResults: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

if (failed === 0) {
  console.log("\x1b[32m✓ All tests passed!\x1b[0m");
} else {
  console.log(`\x1b[31m✗ ${failed} test(s) failed\x1b[0m`);
  Deno.exit(1);
}
