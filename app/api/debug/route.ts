import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { SYSTEM_PROMPT, buildUserMessage } from "@/lib/prompts";
import { validateBugs } from "@/lib/validateBugs";
import { verifyBugs } from "@/lib/verifyBugs";
import {
  DebugResponse,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
} from "@/types";

// Groq uses the OpenAI SDK — lazy-initialized to avoid build-time env var errors
let groq: OpenAI | null = null;

function getGroqClient(): OpenAI {
  if (!groq) {
    groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return groq;
}

// Max code length to prevent abuse and keep token costs low
const MAX_CODE_LENGTH = 5000;

export async function POST(request: NextRequest) {
  try {
    // --- 1. Parse request body ---
    const body = await request.json();
    const { code, language, context } = body;

    // --- 2. Validate: code must exist and be under limit ---
    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return NextResponse.json(
        { error: "Code is required. Paste some code to debug." },
        { status: 400 }
      );
    }

    if (code.length > MAX_CODE_LENGTH) {
      return NextResponse.json(
        {
          error: `Code is too long. Max ${MAX_CODE_LENGTH} characters (yours: ${code.length}).`,
        },
        { status: 400 }
      );
    }

    // --- 3. Validate: language must be supported ---
    if (
      !language ||
      !SUPPORTED_LANGUAGES.includes(language as SupportedLanguage)
    ) {
      return NextResponse.json(
        {
          error: `Unsupported language. Choose one of: ${SUPPORTED_LANGUAGES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // --- 4. Build the prompt and call Groq ---
    const userMessage = buildUserMessage(code, language, context);
    const client = getGroqClient();

    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 2048,
    });

    // --- 5. Parse the AI response ---
    const raw = completion.choices[0]?.message?.content;

    if (!raw) {
      return NextResponse.json(
        { error: "AI returned an empty response. Try again." },
        { status: 502 }
      );
    }

    const parsed: DebugResponse = JSON.parse(raw);

    // --- 6. Validate response shape ---
    if (!Array.isArray(parsed.bugs)) {
      return NextResponse.json(
        { error: "AI response was malformed (missing bugs array). Try again." },
        { status: 502 }
      );
    }

    if (
      typeof parsed.overall_score !== "number" ||
      typeof parsed.overall_summary !== "string" ||
      typeof parsed.roast !== "string"
    ) {
      return NextResponse.json(
        { error: "AI response was malformed (missing top-level fields). Try again." },
        { status: 502 }
      );
    }

    // Clamp overall_score to 1-10
    parsed.overall_score = Math.max(1, Math.min(10, Math.round(parsed.overall_score)));

    // Clamp each bug's severity to 1-10
    parsed.bugs = parsed.bugs.map((bug, index) => ({
      ...bug,
      id: bug.id || index + 1,
      severity: Math.max(1, Math.min(10, Math.round(bug.severity))),
    }));

    // --- 7. Two-pass verification pipeline ---
    const pass1Count = parsed.bugs.length;

    // Pass 0: Deterministic — drop bugs whose broken_code isn't in the original
    parsed.bugs = validateBugs(code, parsed.bugs);
    const postValidateCount = parsed.bugs.length;

    // Pass 2: AI self-critique — verify remaining bugs are real
    if (parsed.bugs.length > 0) {
      parsed.bugs = await verifyBugs(client, code, parsed.bugs);
    }
    const finalCount = parsed.bugs.length;

    // Re-index bug IDs after filtering
    parsed.bugs = parsed.bugs.map((bug, index) => ({
      ...bug,
      id: index + 1,
    }));

    // Recalculate overall_score based on verified bugs
    if (parsed.bugs.length === 0) {
      parsed.overall_score = 10;
      if (pass1Count > 0) {
        parsed.overall_summary = "Code looks clean — no real bugs found after verification.";
      }
    }

    console.log(
      `[/api/debug] Pipeline: ${pass1Count} found → ${postValidateCount} after string-match → ${finalCount} after AI verify`
    );

    // --- 8. Return verified response ---
    return NextResponse.json(parsed, { status: 200 });
  } catch (error: unknown) {
    console.error("[/api/debug] Error:", error);

    // Handle JSON parse errors from malformed AI output
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "AI response wasn't valid JSON. Try again." },
        { status: 502 }
      );
    }

    // Handle Groq API errors
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: `AI service error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
