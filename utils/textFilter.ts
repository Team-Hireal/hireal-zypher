/**
 * Transition sentence start patterns.
 * Any sentence matching these patterns will be filtered out entirely.
 */
const TRANSITION_START_PATTERNS: RegExp[] = [
  /^I'll help you research/i,
  /^I'll help you find/i,
  /^I'll search/i,
  /^I'll try/i,
  /^I'll look/i,
  /^I'll check/i,
  /^I'll gather/i,
  /^I'll start/i,
  /^Let me search/i,
  /^Let me try/i,
  /^Let me look/i,
  /^Let me check/i,
  /^Let me find/i,
  /^Let me gather/i,
  /^Let me get/i,
  /^Let me correct/i,
  /^Let me fix/i,
  /^Let me also/i,
  /^Let me scrape/i,
  /^Now let me/i,
  /^Now I'll/i,
  /^Now I will/i,
  /^First,? I'll/i,
  /^First,? let me/i,
  /^Next,? I'll/i,
  /^Next,? let me/i,
  /^I found some/i,
  /^I found several/i,
  /^I found multiple/i,
  /^I found the following/i,
  /^I found initial/i,
  /^I can see/i,
  /^I need to/i,
  /^Searching for/i,
  /^Looking for/i,
  /^Checking/i,
  /^Gathering/i,
  /^Fetching/i,
  /^Great! Let me/i,
  /^Great! I'll/i,
  /^Great! Now/i,
  /^Great! I found/i,
];

/**
 * Check whether text is a pure transition sentence
 */
export function isTransitionOnlyText(text: string): boolean {
  if (!text) return true;
  const trimmed = text.trim();
  if (!trimmed) return true;

  for (const pattern of TRANSITION_START_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  return false;
}

/**
 * Check whether text starts Markdown content
 */
function isMarkdownStart(text: string): boolean {
  const trimmed = text.trim();
  return /^(#{1,3}\s|\*\*|- )/.test(trimmed);
}

export type SentenceCallback = (sentence: string) => void;

/**
 * Sentence buffer that accumulates text until a complete sentence is formed.
 * Supports automatic Markdown passthrough.
 */
export class SentenceBuffer {
  private buffer = "";
  private onSentence: SentenceCallback;
  private markdownMode = false;

  constructor(onSentence: SentenceCallback) {
    this.onSentence = onSentence;
  }

  /**
   * Add text to buffer
   */
  add(text: string): void {
    this.buffer += text;

    if (!this.markdownMode && isMarkdownStart(this.buffer)) {
      this.markdownMode = true;
    }

    if (this.markdownMode) {
      this.flushDirect();
    } else {
      this.processBuffer();
    }
  }

  /**
   * Flush buffer directly (Markdown mode)
   */
  private flushDirect(): void {
    if (this.buffer) {
      this.onSentence(this.buffer);
      this.buffer = "";
    }
  }

  /**
   * Process buffer and extract sentences (normal mode)
   */
  private processBuffer(): void {
    const markdownIndex = this.buffer.search(/#{1,3}\s|\*\*|- /);

    if (markdownIndex > 0) {
      const beforeMarkdown = this.buffer.slice(0, markdownIndex);
      const afterMarkdown = this.buffer.slice(markdownIndex);

      this.buffer = beforeMarkdown;
      this.processSentences();

      this.markdownMode = true;
      this.buffer = afterMarkdown;
      this.flushDirect();
      return;
    }

    this.processSentences();
  }

  /**
   * Extract and emit complete sentences
   */
  private processSentences(): void {
    const pattern = /^(.*?(?<![A-Z])[.!?])\s+(.*)$/s;

    let match = this.buffer.match(pattern);
    while (match) {
      const sentence = match[1].trim();
      this.buffer = match[2];

      if (sentence) {
        this.emitSentence(sentence);
      }

      match = this.buffer.match(pattern);
    }
  }

  /**
   * Emit sentence with transition filtering
   */
  private emitSentence(sentence: string): void {
    if (isTransitionOnlyText(sentence)) return;
    this.onSentence(sentence);
  }

  /**
   * Flush remaining content
   */
  flush(): void {
    const remaining = this.buffer.trim();
    if (!remaining) return;

    if (this.markdownMode) {
      this.onSentence(remaining);
    } else if (!isTransitionOnlyText(remaining)) {
      this.onSentence(remaining);
    }

    this.buffer = "";
    this.markdownMode = false;
  }

  /**
   * Reset buffer state
   */
  reset(): void {
    this.buffer = "";
    this.markdownMode = false;
  }
}
