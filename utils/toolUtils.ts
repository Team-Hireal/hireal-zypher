/**
 * Tool display name mappings
 */
const TOOL_DISPLAY_NAMES: Record<string, string> = {
  mcp__firecrawl__firecrawl_search: "Web Search",
  mcp__firecrawl__firecrawl_scrape: "Page Scrape",
  mcp__firecrawl__firecrawl_crawl: "Site Crawl",
  mcp__firecrawl__firecrawl_map: "Site Map",
};

/**
 * Pretty site name mappings
 */
const PRETTY_SITE_NAMES: Record<string, string> = {
  linkedin: "LinkedIn",
  github: "GitHub",
  twitter: "Twitter",
  x: "X (Twitter)",
  facebook: "Facebook",
  instagram: "Instagram",
  researchgate: "ResearchGate",
  scholar: "Google Scholar",
  orcid: "ORCID",
  medium: "Medium",
  stackoverflow: "Stack Overflow",
  reddit: "Reddit",
  youtube: "YouTube",
  wikipedia: "Wikipedia",
  crunchbase: "Crunchbase",
  glassdoor: "Glassdoor",
  indeed: "Indeed",
};

/**
 * Get human-readable tool name
 */
export function getToolDisplayName(toolName: string): string {
  return (
    TOOL_DISPLAY_NAMES[toolName] ||
    toolName.replace(/^mcp__\w+__/, "").replace(/_/g, " ")
  );
}

/**
 * Normalize and prettify site name
 */
export function prettifySiteName(domain: string): string {
  const lower = domain.toLowerCase();
  return (
    PRETTY_SITE_NAMES[lower] ||
    domain.charAt(0).toUpperCase() + domain.slice(1)
  );
}

/**
 * Extract display detail from tool input
 */
export function extractToolDetail(
  toolName: string,
  input: string,
): string {
  if (!input) return "";

  try {
    const parsed = JSON.parse(input);

    if (toolName.includes("search") && parsed.query) {
      const query = String(parsed.query);
      return query.length > 30 ? query.slice(0, 30) + "..." : query;
    }

    if (
      (toolName.includes("scrape") || toolName.includes("crawl")) &&
      parsed.url
    ) {
      return extractSiteNameFromUrl(parsed.url);
    }
  } catch {
    return "";
  }

  return "";
}

/**
 * Extract site name from URL
 */
export function extractSiteNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(String(url));
    const host = urlObj.hostname.replace("www.", "");
    const domain = host.split(".")[0];
    return prettifySiteName(domain);
  } catch {
    return String(url).slice(0, 30);
  }
}

/**
 * Simplify tool error messages for UI display
 */
export function simplifyToolError(error: string): string {
  const e = error.toLowerCase();

  if (e.includes("not currently supported")) return "Source not supported";
  if (e.includes("parameter validation")) return "Retrying with adjusted parameters";
  if (e.includes("timeout") || e.includes("timed out")) return "Request timed out, retrying";
  if (e.includes("rate limit")) return "Too many requests";
  if (e.includes("not found") || e.includes("404")) return "Page not found";
  if (e.includes("forbidden") || e.includes("403")) return "Access denied";
  if (e.includes("unauthorized") || e.includes("401")) return "Authorization required";

  return "An error occurred, retrying";
}

/**
 * Build tool display name with extracted detail
 */
export function buildToolDisplayWithDetail(
  toolName: string,
  input: string,
): string {
  const baseName = getToolDisplayName(toolName);
  const detail = extractToolDetail(toolName, input);
  return detail ? `${baseName}: ${detail}` : baseName;
}
