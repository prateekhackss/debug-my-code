// TypeScript interfaces for the debug API
// This is the CONTRACT between the API route and the frontend

export interface DebugRequest {
  code: string;
  language: SupportedLanguage;
  context?: string;
}

export type SupportedLanguage =
  | "javascript"
  | "python"
  | "typescript"
  | "java"
  | "cpp";

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  "javascript",
  "python",
  "typescript",
  "java",
  "cpp",
];

// --- Response types (matches the JSON schema the AI returns) ---

export interface Bug {
  id: number;
  /** Short name for the bug */
  title: string;
  /** The exact line or section that's broken */
  location: string;
  /** The problematic code snippet */
  broken_code: string;
  /** Plain English explanation of what happens when this runs */
  what_goes_wrong: string;
  /** What you probably MEANT to do vs what this actually does */
  intent_vs_reality: string;
  /** The corrected version of that section */
  fixed_code: string;
  /** Explanation of why the fix works */
  why_this_fixes_it: string;
  /** The general principle to remember */
  lesson: string;
  /** 1-10 severity score */
  severity: number;
}

export interface DebugResponse {
  /** Array of all bugs found */
  bugs: Bug[];
  /** Overall code quality score 1-10 */
  overall_score: number;
  /** One sentence summary of the code's health */
  overall_summary: string;
  /** One savage but funny line about this code */
  roast: string;
  /** The language that was detected/analyzed */
  language_detected: string;
}

export interface ApiErrorResponse {
  error: string;
}
