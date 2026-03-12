import OpenAI from "openai";
import { Bug } from "@/types";

// ============================================================
// AI SELF-CRITIQUE PASS (Pass 2)
// Takes the original code + the bug list from Pass 1,
// and asks the AI to verify each bug is real.
//
// FIX: Now uses ID-based filtering. The AI returns only the
// IDs of confirmed bugs, and we filter the ORIGINAL bug list.
// This prevents the AI from modifying/hallucinating bug data.
// ============================================================

/**
 * The verification prompt — instructs the AI to return only
 * the IDs of bugs it can confirm as real.
 */
const VERIFY_PROMPT = `You are a strict code verification expert. You will be given:
1. The ORIGINAL source code
2. A list of reported bugs (each with an "id" field)

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
  "verified_bug_ids": [1, 3]
}

Include ONLY the "id" values of bugs that are REAL.
If ALL bugs are false positives, return: { "verified_bug_ids": [] }
Be STRICT. When in doubt, REMOVE the bug.`;

/**
 * Sends the original code + bug list to the AI for verification.
 * Returns only bugs whose IDs the AI confirms as real.
 *
 * KEY FIX: Instead of trusting the AI to return full bug objects
 * (which it can modify or hallucinate), we ask it to return only
 * the IDs of confirmed bugs, then filter our ORIGINAL list.
 * This guarantees the returned bugs are exactly what Pass 1 found.
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

Verify each bug. Return ONLY the IDs of real bugs.`;

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
      max_tokens: 1024, // IDs-only response is much smaller
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      console.log("[verifyBugs] AI returned empty response — keeping all bugs");
      return bugs;
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed.verified_bug_ids)) {
      console.log("[verifyBugs] Malformed response — keeping all bugs");
      return bugs;
    }

    // Filter ORIGINAL bugs by the IDs the AI confirmed
    const confirmedIds = new Set<number>(parsed.verified_bug_ids);
    const verified = bugs.filter((bug) => confirmedIds.has(bug.id));

    const droppedCount = bugs.length - verified.length;
    console.log(
      `[verifyBugs] Kept ${verified.length}, dropped ${droppedCount} of ${bugs.length} bugs`
    );

    return verified;
  } catch (error) {
    // If verification fails for any reason, return original bugs
    // (don't block the user because of a verification error)
    console.error("[verifyBugs] Verification failed, keeping all bugs:", error);
    return bugs;
  }
}
