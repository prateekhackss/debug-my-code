import OpenAI from "openai";
import { Bug } from "@/types";

// ============================================================
// AI SELF-CRITIQUE PASS (Pass 2)
// Takes the original code + the bug list from Pass 1,
// and asks the AI to verify each bug is real.
// The model is much better at VERIFYING claims than
// GENERATING them — this catches hallucinations that
// slipped past the deterministic string-match filter.
// ============================================================

/**
 * The verification prompt — instructs the AI to act as a
 * strict code reviewer who only keeps bugs it can confirm.
 */
const VERIFY_PROMPT = `You are a strict code verification expert. You will be given:
1. The ORIGINAL source code
2. A list of reported bugs

Your job: For EACH bug, verify whether it is a REAL bug or a FALSE POSITIVE.

A bug is REAL if:
- The broken_code actually appears in the original source code
- The described problem would actually cause incorrect behavior, a crash, or a security issue
- The fix is correct and necessary

A bug is a FALSE POSITIVE if:
- The broken_code does not exist in the original source code
- The described problem would NOT actually cause an issue (e.g., style preference, not a real bug)
- The "bug" is about missing features or hypothetical edge cases the code wasn't designed to handle
- The fix introduces new problems or is unnecessary

Return ONLY valid JSON with this structure:
{
  "verified_bugs": [
    // Include ONLY bugs that are REAL. Copy them exactly as provided.
    // Do NOT modify the bug objects. Just include or exclude them.
  ]
}

If ALL bugs are false positives, return: { "verified_bugs": [] }
Be STRICT. When in doubt, REMOVE the bug.`;

/**
 * Sends the original code + bug list to the AI for verification.
 * Returns only bugs the AI confirms as real.
 *
 * Uses a lower temperature (0.1) than Pass 1 for maximum precision.
 */
export async function verifyBugs(
  client: OpenAI,
  originalCode: string,
  bugs: Bug[]
): Promise<Bug[]> {
  // No bugs to verify — skip the API call entirely
  if (bugs.length === 0) return [];

  const userMessage = `ORIGINAL CODE:
\`\`\`
${originalCode}
\`\`\`

REPORTED BUGS:
${JSON.stringify(bugs, null, 2)}

Verify each bug. Return only the real ones.`;

  try {
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: VERIFY_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      top_p: 0.9,
      max_tokens: 2048,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      console.log("[verifyBugs] AI returned empty response — keeping all bugs");
      return bugs;
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed.verified_bugs)) {
      console.log("[verifyBugs] Malformed response — keeping all bugs");
      return bugs;
    }

    const keptCount = parsed.verified_bugs.length;
    const droppedCount = bugs.length - keptCount;
    console.log(
      `[verifyBugs] Kept ${keptCount}, dropped ${droppedCount} of ${bugs.length} bugs`
    );

    return parsed.verified_bugs;
  } catch (error) {
    // If verification fails for any reason, return original bugs
    // (don't block the user because of a verification error)
    console.error("[verifyBugs] Verification failed, keeping all bugs:", error);
    return bugs;
  }
}
