/**
 * Security and sanitization utilities for the portal global search helper.
 * Enforces defense-in-depth against XSS payloads, script injection, control characters,
 * and memory/regex DOS attacks.
 */

/** Maximum allowed search query string length to prevent payload DOS. */
export const MAX_SEARCH_QUERY_LENGTH = 80;

/**
 * Sanitizes raw user search input by stripping HTML tags, script vectors,
 * control characters, null bytes, and dangerous quotes/brackets.
 */
export function sanitizeSearchQuery(input: string): string {
  if (!input) return '';

  const truncated = input.slice(0, MAX_SEARCH_QUERY_LENGTH);
  let result = '';

  for (let i = 0; i < truncated.length; i++) {
    const code = truncated.charCodeAt(i);
    // Filter out null bytes and ASCII control characters (0x00 - 0x1F, 0x7F)
    if ((code >= 0x20 && code !== 0x7f) || code > 0x7f) {
      result += truncated[i];
    }
  }

  return result
    // Strip HTML/XML tag markers (<script>, <iframe>, <img>, etc.)
    .replace(/<[^>]*>?/gm, '')
    // Strip dangerous script/injection chars (<, >, ", ', `, \, $)
    .replace(/[<>"'`\\$]/g, '')
    // Collapse excessive whitespace
    .replace(/\s+/g, ' ')
    // Trim leading and trailing whitespace
    .trim();
}

/**
 * Checks if a search item matches a query safely without dynamic regex or eval.
 * Supports tokenized matching across title, description, category, and keywords.
 */
export function matchesSearchQuery(
  query: string,
  targetFields: {
    title: string;
    description: string;
    category: string;
    keywords: string[];
  }
): boolean {
  const sanitized = sanitizeSearchQuery(query).toLowerCase();
  if (!sanitized) return true; // Empty query matches all items (shows defaults)

  const tokens = sanitized.split(' ').filter(Boolean);

  const searchableText = [
    targetFields.title,
    targetFields.description,
    targetFields.category,
    ...targetFields.keywords,
  ]
    .join(' ')
    .toLowerCase();

  // All query tokens must match somewhere in the target text (AND logic)
  return tokens.every((token) => searchableText.includes(token));
}
