import { Bug } from "@/types";

// ============================================================
// DETERMINISTIC BUG VALIDATION
// Filters out hallucinated bugs by checking if the AI's
// "broken_code" actually exists in the user's original code.
// This is Pass 0 — no AI involved, pure string matching.
// ============================================================

/**
 * Normalize whitespace so minor formatting differences
 * (extra spaces, tabs vs spaces, trailing newlines)
 * don't cause false negatives.
 *
 * Example:
 *   "  const  x  =  10  " → "const x = 10"
 *
 * We do NOT lowercase — code is case-sensitive.
 */
function normalize(code: string): string {
  return code
    .split("\n")                    // split into lines
    .map((line) => line.trim())     // trim each line
    .filter((line) => line !== "")  // drop empty lines
    .join("\n")                     // rejoin
    .replace(/\s+/g, " ");         // collapse all whitespace to single space
}

/**
 * Validates a list of AI-reported bugs against the original code.
 *
 * For each bug, checks:
 *   1. Does bug.broken_code exist in the original code?
 *      → Uses normalized whitespace matching
 *   2. Is bug.broken_code non-empty?
 *      → Empty snippets are always hallucinations
 *
 * Returns only bugs that pass validation.
 * Dropped bugs are logged for debugging (server-side only).
 */
export function validateBugs(originalCode: string, bugs: Bug[]): Bug[] {
  const normalizedOriginal = normalize(originalCode);

  return bugs.filter((bug, index) => {
    // Guard: broken_code must be a non-empty string
    if (!bug.broken_code || bug.broken_code.trim() === "") {
      console.log(
        `[validateBugs] Dropped bug #${index + 1} ("${bug.title}"): empty broken_code`
      );
      return false;
    }

    const normalizedBroken = normalize(bug.broken_code);

    // Core check: does the broken code actually appear in the original?
    const exists = normalizedOriginal.includes(normalizedBroken);

    if (!exists) {
      console.log(
        `[validateBugs] Dropped bug #${index + 1} ("${bug.title}"): broken_code not found in original`
      );
      console.log(`  → Looking for: "${normalizedBroken.slice(0, 80)}..."`);
    }

    return exists;
  });
}
