# Query Classification System

## Overview

Hunter uses an intelligent query classification system to determine when to trigger the full agentic research workflow versus simple conversational responses.

## How It Works

Every user query is analyzed by the `isResearchQuery()` function in `server.ts` to determine if it requires research capabilities.

### Research Workflow Triggers

The following patterns trigger the full agentic research workflow with access to all tools (Wayback Machine, web search, etc.):

#### 1. Task-Based Action Verbs
Queries containing action verbs that indicate the user wants something done:
- `research`, `find`, `search`, `analyze`, `compare`, `verify`, `check`
- `investigate`, `examine`, `review`, `assess`, `evaluate`
- `show`, `get`, `retrieve`, `fetch`, `list`, `identify`
- `track`, `monitor`, `audit`, `validate`

**Examples:**
- "analyze changes to skyrisai.com" ✓
- "investigate the background of this company" ✓
- "verify credentials of Jane Smith" ✓

#### 2. Information Requests
Queries asking for information:
- `tell me about`, `information about`, `who is`, `what is`
- `details about`, `background on`

**Examples:**
- "tell me about John Doe" ✓
- "who is Simon Jiahe Tian?" ✓
- "what is the background of this person?" ✓

#### 3. Website and Archive Queries
Any mention of websites, domains, or archives:
- `website`, `site`, `domain`, `url`, `web`
- `archive`, `wayback`, `snapshot`
- `changes`, `history`, `evolution`, `timeline`

**Examples:**
- "check the history of google.com" ✓
- "analyze website changes" ✓
- "show me the wayback archive" ✓

#### 4. Due Diligence Keywords
Background verification and due diligence terms:
- `due diligence`, `background`, `profile`, `credentials`
- `verification`, `validate`, `confirm`

**Examples:**
- "due diligence on the company" ✓
- "background check on the person" ✓
- "verify the credentials" ✓

#### 5. Comparison Queries
Requests to compare or contrast:
- `difference`, `vs`, `versus`, `between`, `compare`, `contrast`

**Examples:**
- "compare example.com and test.com" ✓
- "what is the difference between v1 and v2" ✓
- "contrast the two approaches" ✓

#### 6. URL/Domain Detection
Any query containing a domain name:
- Matches patterns like: `example.com`, `test.io`, `openai.com`
- Supports TLDs: `.com`, `.org`, `.net`, `.io`, `.ai`, `.co`, `.dev`, `.app`, `.tech`

**Examples:**
- "visit example.com" ✓
- "check openai.com" ✓
- "what about test.io" ✓

#### 7. Person Name Pattern
Capitalized names (First Last format):
- Matches: "John Doe", "Jane Smith", "Simon Jiahe Tian"

**Examples:**
- "Who is Simon Tian?" ✓
- "Research Alice Johnson" ✓

### Non-Research Responses

The following queries do NOT trigger research and get simple conversational responses:

#### Excluded Patterns
- **Simple greetings**: `hi`, `hello`, `hey`
- **Acknowledgments**: `thanks`, `yes`, `no`, `ok`, `help`
- **Identity questions**: `who are you`, `what can you do`

**Examples:**
- "hi" ✗ (simple greeting response)
- "thanks" ✗ (acknowledgment response)
- "who are you" ✗ (identity response)

## Implementation

### Location
`server.ts` - Lines 90-130

### Function Signature
```typescript
function isResearchQuery(query: string): boolean
```

### Logic Flow
```typescript
function isResearchQuery(query: string): boolean {
  const q = query.trim();

  // 1. Exclude simple greetings and acknowledgments
  if (/^(hi|hello|hey|thanks?|yes|no|ok|help)[\s!.,]*$/i.test(q))
    return false;

  if (/^(who are you|what can you do)/i.test(q))
    return false;

  // 2. Check for task-based action verbs
  if (/(research|find|search|analyze|compare|verify|...)/i.test(q))
    return true;

  // 3. Check for information requests
  if (/(tell me about|information about|who is|...)/i.test(q))
    return true;

  // 4. Check for website/archive keywords
  if (/(website|site|domain|archive|wayback|...)/i.test(q))
    return true;

  // 5. Check for due diligence keywords
  if (/(due diligence|background|profile|...)/i.test(q))
    return true;

  // 6. Check for comparison keywords
  if (/(difference|vs|versus|between|...)/i.test(q))
    return true;

  // 7. Check for URL/domain patterns
  if (/\b[a-z0-9-]+\.(com|org|net|io|ai|...)\b/i.test(q))
    return true;

  // 8. Check for person name patterns
  if (/[A-Z][a-z]+(\s*\([A-Za-z]+\))?\s+[A-Z][a-z]+/.test(q))
    return true;

  // Default: non-research
  return false;
}
```

## Testing

### Test Suite
`utils/queryClassification.test.ts`

### Run Tests
```bash
deno run utils/queryClassification.test.ts
```

### Test Coverage
- ✓ 31 test cases covering all patterns
- ✓ 23 research query patterns
- ✓ 8 non-research patterns
- ✓ 100% pass rate

### Example Test Cases
```typescript
// Research queries (should return true)
"analyze changes to skyrisai.com"
"Could you tell me the changes made to skyrisai.com?"
"Who is Simon Jiahe Tian?"
"verify credentials of Jane Smith"
"compare example.com and test.com"
"due diligence on the company"

// Non-research queries (should return false)
"hi"
"thanks"
"who are you"
```

## What Happens When Research Is Triggered

When `isResearchQuery()` returns `true`:

1. **Full Agent Activation**
   - Agent receives comprehensive research prompt
   - Access to all MCP tools (Wayback Machine, web search, etc.)
   - Conversation history included for context

2. **Tool Usage**
   - Agent can use Wayback Machine for website analysis
   - Agent can use web search for information gathering
   - Agent can use Firecrawl for web scraping

3. **Response Format**
   - Structured Markdown output
   - Source citations included
   - Verification standards applied
   - Red flags highlighted

## What Happens for Non-Research Queries

When `isResearchQuery()` returns `false`:

1. **Simple Response Mode**
   - Agent receives basic conversational prompt
   - 1-2 sentence responses
   - No tool usage required
   - Fast response time

2. **Example Responses**
   - "Hi" → "Hello! I'm Hunter, a background verification and due diligence AI agent. How can I help you today?"
   - "Thanks" → "You're welcome! Let me know if you need anything else."

## Adding New Patterns

To add new patterns that should trigger research:

1. **Edit** `server.ts` - `isResearchQuery()` function
2. **Add** your pattern to the appropriate regex
3. **Test** with `utils/queryClassification.test.ts`
4. **Add** test cases for your new pattern

### Example: Adding "lookup" keyword
```typescript
// Add to task-based action verbs section
if (/(research|find|search|...|lookup)/i.test(q))
  return true;
```

## Performance

- **Classification time**: < 1ms per query
- **Regex-based**: Fast pattern matching
- **No API calls**: All classification done locally
- **Case-insensitive**: Works with any capitalization

## Benefits

1. **Automatic Tool Selection**: Agent knows when to use research tools
2. **Efficient Resource Usage**: Simple queries don't trigger expensive operations
3. **Better User Experience**: Fast responses for greetings, detailed research when needed
4. **Flexible**: Easy to add new patterns as needed

## Status: ✅ Fully Implemented and Tested

All task-based queries now trigger the full agentic research workflow with access to Wayback Machine and other tools.
