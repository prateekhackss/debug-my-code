"use client";

import { useState, useEffect, useCallback } from "react";
import CodeInput from "@/components/CodeInput";
import LoadingState from "@/components/LoadingState";
import ResultCard from "@/components/ResultCard";
import SeverityBadge from "@/components/SeverityBadge";
import CodeEditor from "@/components/CodeEditor";
import { DebugResponse, SupportedLanguage, Bug } from "@/types";

// --- Helper: find which lines in a code block to highlight (1-indexed) ---
function getAllLineNumbers(code: string): number[] {
  if (!code) return [];
  const lines = code.split("\n");
  return lines.map((_, i) => i + 1);
}

// --- Rate Limiting Helpers ---
const DAILY_LIMIT = 5;
const STORAGE_KEY_COUNT = "debugCount";
const STORAGE_KEY_DATE = "debugDate";

function getTodayString(): string {
  return new Date().toISOString().split("T")[0]; // "2026-03-08"
}

function getRateLimit(): { count: number; remaining: number; isLimited: boolean } {
  if (typeof window === "undefined") return { count: 0, remaining: DAILY_LIMIT, isLimited: false };

  const storedDate = localStorage.getItem(STORAGE_KEY_DATE);
  const today = getTodayString();

  // Reset if it's a new day
  if (storedDate !== today) {
    localStorage.setItem(STORAGE_KEY_DATE, today);
    localStorage.setItem(STORAGE_KEY_COUNT, "0");
    return { count: 0, remaining: DAILY_LIMIT, isLimited: false };
  }

  const count = parseInt(localStorage.getItem(STORAGE_KEY_COUNT) || "0", 10);
  return {
    count,
    remaining: Math.max(0, DAILY_LIMIT - count),
    isLimited: count >= DAILY_LIMIT,
  };
}

function incrementCount(): void {
  const today = getTodayString();
  localStorage.setItem(STORAGE_KEY_DATE, today);
  const current = parseInt(localStorage.getItem(STORAGE_KEY_COUNT) || "0", 10);
  localStorage.setItem(STORAGE_KEY_COUNT, String(current + 1));
}

// --- Card config for rendering bug fields ---
function getBugCards(bug: Bug) {
  return [
    {
      icon: "📍",
      title: "Bug Location",
      content: bug.location,
      color: "red" as const,
    },
    {
      icon: "💥",
      title: "What Goes Wrong",
      content: bug.what_goes_wrong,
      color: "yellow" as const,
    },
    {
      icon: "🎯",
      title: "Intent vs Reality",
      content: bug.intent_vs_reality,
      color: "orange" as const,
    },
    {
      icon: "💡",
      title: "Why This Fixes It",
      content: bug.why_this_fixes_it,
      color: "green" as const,
    },
    {
      icon: "📚",
      title: "Lesson",
      content: bug.lesson,
      color: "blue" as const,
    },
  ];
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DebugResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState({ count: 0, remaining: DAILY_LIMIT, isLimited: false });
  const [submittedLanguage, setSubmittedLanguage] = useState<SupportedLanguage>("javascript");

  // Check rate limit on mount
  useEffect(() => {
    setRateLimit(getRateLimit());
  }, []);

  const handleSubmit = useCallback(
    async (code: string, language: SupportedLanguage, context: string) => {
      // Re-check rate limit before submitting
      const currentLimit = getRateLimit();
      if (currentLimit.isLimited) {
        setRateLimit(currentLimit);
        return;
      }

      setIsLoading(true);
      setResult(null);
      setError(null);
      setSubmittedLanguage(language);

      try {
        const res = await fetch("/api/debug", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, language, context }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Something went wrong.");
          return;
        }

        setResult(data as DebugResponse);

        // Increment rate limit on success
        incrementCount();
        setRateLimit(getRateLimit());
      } catch {
        setError("Failed to connect to the server. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        {/* Header */}
        <header className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-100">
            Debug My Code{" "}
            <span className="text-orange-500">🔥</span>
          </h1>
          <p className="mt-2 text-zinc-400 text-sm sm:text-base">
            Paste your code. Get roasted. Get fixed.
          </p>
          {/* Rate limit counter */}
          <p className="mt-3 text-xs text-zinc-500">
            {rateLimit.remaining} / {DAILY_LIMIT} debugs remaining today
          </p>
        </header>

        {/* Rate limit reached */}
        {rateLimit.isLimited ? (
          <div className="text-center py-16 space-y-4">
            <div className="text-5xl">🚫</div>
            <h2 className="text-xl font-bold text-zinc-200">
              Daily limit reached
            </h2>
            <p className="text-zinc-400 text-sm max-w-md mx-auto">
              Come back tomorrow or follow{" "}
              <a
                href="https://twitter.com/prateekhacks"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 font-medium underline underline-offset-2"
              >
                @prateekhacks
              </a>{" "}
              for updates.
            </p>
          </div>
        ) : (
          <>
            {/* Code Input */}
            <CodeInput onSubmit={handleSubmit} isLoading={isLoading} />

            {/* Loading State */}
            {isLoading && <LoadingState />}

            {/* Error */}
            {error && (
              <div className="mt-8 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                <span className="font-bold">Error:</span> {error}
              </div>
            )}

            {/* Results */}
            {result && !isLoading && (() => {
              // --- Code Health Score ---
              const bugCount = result.bugs.length;
              const healthScore = bugCount === 0
                ? 10
                : Math.max(1, Math.round(10 - result.bugs.reduce((sum, b) => sum + b.severity, 0) / bugCount));

              const healthColor =
                healthScore >= 8 ? "text-green-400" :
                  healthScore >= 5 ? "text-yellow-400" :
                    healthScore >= 3 ? "text-orange-400" : "text-red-400";

              const healthLabel =
                healthScore >= 8 ? "Your code is solid" :
                  healthScore >= 5 ? "Needs work" :
                    healthScore >= 3 ? "Concerning" : "Start over";

              const healthBg =
                healthScore >= 8 ? "bg-green-500/10 border-green-500/30" :
                  healthScore >= 5 ? "bg-yellow-500/10 border-yellow-500/30" :
                    healthScore >= 3 ? "bg-orange-500/10 border-orange-500/30" : "bg-red-500/10 border-red-500/30";

              // --- Bug counter ---
              const bugCounterIcon =
                bugCount === 0 ? "✅" :
                  bugCount <= 2 ? "⚠️" :
                    bugCount <= 5 ? "🔥" : "💀";

              const bugCounterText =
                bugCount === 0 ? "Clean code!" :
                  bugCount <= 2 ? `Found ${bugCount} bug${bugCount > 1 ? "s" : ""}` :
                    bugCount <= 5 ? `Found ${bugCount} bugs` :
                      `Found ${bugCount} bugs — we need to talk`;

              const bugCounterColor =
                bugCount === 0 ? "text-green-400" :
                  bugCount <= 2 ? "text-yellow-400" :
                    bugCount <= 5 ? "text-orange-400" : "text-red-400";

              return (
                <div className="mt-10 space-y-8">
                  {/* Code Health Score */}
                  <div
                    className={`p-6 rounded-xl border animate-[fadeSlideIn_0.4s_ease-out_forwards] opacity-0 ${healthBg}`}
                  >
                    <div className="flex flex-col sm:flex-row items-center gap-5">
                      {/* Big score */}
                      <div className="text-center">
                        <span className={`text-5xl font-black ${healthColor}`}>
                          {healthScore}
                        </span>
                        <span className="text-2xl text-zinc-500 font-light">/10</span>
                        <p className={`text-xs font-semibold uppercase tracking-wider mt-1 ${healthColor}`}>
                          {healthLabel}
                        </p>
                      </div>

                      {/* Summary + bug counter */}
                      <div className="flex-1 text-center sm:text-left">
                        <h2 className="text-lg font-bold text-zinc-100">
                          Code Health Score
                        </h2>
                        <p className="text-zinc-400 text-sm mt-1">
                          {result.overall_summary}
                        </p>
                        <p className={`text-sm font-bold mt-2 ${bugCounterColor}`}>
                          {bugCounterIcon} {bugCounterText}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bugs */}
                  {result.bugs.map((bug, bugIndex) => {
                    // Each bug gets: header (1 step) + diff (1 step) + cards (5 steps) = 7 steps
                    // Health Score takes step 0, so bugs start at step 1
                    const bugBaseStep = 1 + bugIndex * 7;

                    return (
                      <div key={bug.id} className="space-y-3">
                        {/* Bug header */}
                        <div
                          className="flex items-center gap-3 animate-[fadeSlideIn_0.5s_ease-out_forwards] opacity-0"
                          style={{ animationDelay: `${bugBaseStep * 500}ms` }}
                        >
                          <SeverityBadge score={bug.severity} compact />
                          <h3 className="text-base font-bold text-zinc-200">
                            Bug #{bug.id}: {bug.title}
                          </h3>
                        </div>

                        {/* Side-by-side diff: Broken vs Fixed */}
                        <div
                          className="grid grid-cols-1 lg:grid-cols-2 gap-3 animate-[fadeSlideIn_0.5s_ease-out_forwards] opacity-0"
                          style={{ animationDelay: `${(bugBaseStep + 1) * 500}ms` }}
                        >
                          {/* Broken code */}
                          <div>
                            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-red-400 uppercase tracking-wide">
                              <span>🐛</span> Broken Code
                            </div>
                            <CodeEditor
                              value={bug.broken_code}
                              language={submittedLanguage}
                              readOnly
                              highlightLines={getAllLineNumbers(bug.broken_code)}
                              highlightColor="red"
                              minHeight={80}
                            />
                          </div>

                          {/* Fixed code */}
                          <div>
                            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-green-400 uppercase tracking-wide">
                              <span>✅</span> Fixed Code
                            </div>
                            <CodeEditor
                              value={bug.fixed_code}
                              language={submittedLanguage}
                              readOnly
                              highlightLines={getAllLineNumbers(bug.fixed_code)}
                              highlightColor="green"
                              minHeight={80}
                            />
                          </div>
                        </div>

                        {/* Other bug cards (non-code fields) */}
                        {getBugCards(bug).map((card, cardIndex) => (
                          <div
                            key={card.title}
                            className="animate-[fadeSlideIn_0.5s_ease-out_forwards] opacity-0"
                            style={{
                              animationDelay: `${(bugBaseStep + 2 + cardIndex) * 500}ms`,
                            }}
                          >
                            <ResultCard
                              icon={card.icon}
                              title={card.title}
                              color={card.color}
                              content={<p>{card.content}</p>}
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })}

                  {/* Roast Card — appears last */}
                  {(() => {
                    const roastStep = 1 + result.bugs.length * 7;
                    const totalRevealMs = (roastStep + 1) * 500;
                    return (
                      <>
                        <div
                          className="animate-[fadeSlideIn_0.5s_ease-out_forwards] opacity-0"
                          style={{ animationDelay: `${roastStep * 500}ms` }}
                        >
                          <ResultCard
                            icon="🔥"
                            title="The Roast"
                            color="purple"
                            content={
                              <p className="text-base italic">&ldquo;{result.roast}&rdquo;</p>
                            }
                          />
                        </div>

                        {/* Blinking typing cursor — disappears when last card reveals */}
                        <div
                          className="flex justify-center"
                          style={{
                            animation: `blinkCursor 0.5s step-end infinite, fadeSlideIn 0.3s ease-out ${totalRevealMs}ms reverse forwards`,
                          }}
                        >
                          <span className="text-orange-500 text-2xl font-light select-none">|</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              );
            })()}
          </>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-xs text-zinc-600">
          Built by{" "}
          <a
            href="https://twitter.com/prateekhacks"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-orange-400 transition-colors"
          >
            @prateekhacks
          </a>{" "}
          • Powered by Groq
        </footer>
      </div>
    </div>
  );
}
