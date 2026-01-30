# Wayback Machine Integration

This integration provides tools for checking archived versions of websites using the Internet Archive's Wayback Machine API.

## Features

- Check if a URL is archived in the Wayback Machine
- Get the oldest and newest archived snapshots
- Compare snapshots over time to detect changes
- Format Wayback timestamps into readable dates

## Files

- `utils/waybackMachine.ts` - Core utility functions for Wayback Machine API
- `mcp-servers/wayback-server.ts` - MCP server that exposes Wayback tools to the Zypher Agent
- `utils/waybackMachine.test.ts` - Test file for the utility functions

## Usage

### Direct Usage (TypeScript/Deno)

```typescript
import {
  checkWaybackAvailability,
  compareSnapshots,
  isUrlArchived,
} from "./utils/waybackMachine.ts";

// Check if a URL is archived
const snapshot = await checkWaybackAvailability("example.com");
if (snapshot.available) {
  console.log("Archived at:", snapshot.url);
  console.log("Timestamp:", snapshot.timestamp);
}

// Compare oldest and newest snapshots
const comparison = await compareSnapshots("example.com");
if (comparison.hasChanges) {
  console.log("The website has changed over time!");
}

// Simple boolean check
const isArchived = await isUrlArchived("example.com");
console.log("Is archived:", isArchived);
```

### Via Zypher Agent

The Wayback Machine tools are automatically registered with the Zypher Agent and can be used in research tasks:

```typescript
// The agent can now use these tools:
// - check_wayback_availability
// - compare_wayback_snapshots
// - get_oldest_snapshot
// - get_newest_snapshot
// - is_url_archived
```

## Available Tools

### check_wayback_availability
Check if a URL is archived and get snapshot information.

**Parameters:**
- `url` (required): The URL to check
- `timestamp` (optional): Specific timestamp to look up (YYYYMMDDhhmmss format)

**Returns:**
```json
{
  "available": true,
  "url": "http://web.archive.org/web/20130919044612/http://example.com/",
  "timestamp": "20130919044612",
  "formattedDate": "2013-09-19 04:46:12",
  "status": "200"
}
```

### compare_wayback_snapshots
Compare the oldest and newest archived snapshots.

**Parameters:**
- `url` (required): The URL to compare

**Returns:**
```json
{
  "url": "example.com",
  "hasChanges": true,
  "oldestSnapshot": { ... },
  "newestSnapshot": { ... }
}
```

### get_oldest_snapshot
Get the oldest archived snapshot of a URL.

**Parameters:**
- `url` (required): The URL to check

### get_newest_snapshot
Get the most recent archived snapshot of a URL.

**Parameters:**
- `url` (required): The URL to check

### is_url_archived
Simple boolean check if a URL has been archived.

**Parameters:**
- `url` (required): The URL to check

**Returns:**
```json
{
  "archived": true
}
```

## Testing

Run the test suite:

```bash
deno run --allow-net utils/waybackMachine.test.ts
```

## API Reference

The integration uses the Internet Archive's Wayback Availability JSON API:

- Base URL: `https://archive.org/wayback/available`
- Documentation: https://archive.org/help/wayback_api.php

## Integration with Server

The Wayback Machine MCP server is automatically registered in `server.ts`:

```typescript
await agent.mcp.registerServer({
  id: "wayback-machine",
  type: "command",
  command: {
    command: "deno",
    args: ["run", "--allow-net", "--allow-env", "./mcp-servers/wayback-server.ts"],
    env: {},
  },
});
```

## Error Handling

All functions include error handling and will return appropriate error messages or default values if the API is unavailable or returns unexpected data.

## License

Part of the Hireal Zypher project.