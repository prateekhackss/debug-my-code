"use client";

import { useState, useEffect, useCallback } from "react";
import CodeInput from "@/components/CodeInput";
import LoadingState from "@/components/LoadingState";
import ResultCard from "@/components/ResultCard";
import SeverityBadge from "@/components/SeverityBadge";
import { DebugResponse, SupportedLanguage, Bug } from "@/types";

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
      icon: "✅",
      title: "The Fix",
      content: bug.fixed_code,
      color: "green" as const,
      isCode: true,
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
            {result && !isLoading && (
              <div className="mt-10 space-y-8">
                {/* Overall Summary Header */}
                <div
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-xl bg-zinc-900 border border-zinc-800 animate-[fadeSlideIn_0.4s_ease-out_forwards] opacity-0"
                >
                  <SeverityBadge score={result.overall_score} />
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-zinc-100">
                      Overall Verdict
                    </h2>
                    <p className="text-zinc-400 text-sm mt-1">
                      {result.overall_summary}
                    </p>
                  </div>
                </div>

                {/* Bugs */}
                {result.bugs.map((bug, bugIndex) => (
                  <div key={bug.id} className="space-y-3">
                    {/* Bug header */}
                    <div
                      className="flex items-center gap-3 animate-[fadeSlideIn_0.4s_ease-out_forwards] opacity-0"
                      style={{ animationDelay: `${(bugIndex * 7 + 1) * 200}ms` }}
                    >
                      <SeverityBadge score={bug.severity} compact />
                      <h3 className="text-base font-bold text-zinc-200">
                        Bug #{bug.id}: {bug.title}
                      </h3>
                    </div>

                    {/* Broken code block */}
                    <div
                      className="animate-[fadeSlideIn_0.4s_ease-out_forwards] opacity-0"
                      style={{ animationDelay: `${(bugIndex * 7 + 2) * 200}ms` }}
                    >
                      <ResultCard
                        icon="🐛"
                        title="Broken Code"
                        color="red"
                        content={
                          <pre className="font-mono text-xs bg-zinc-950 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                            {bug.broken_code}
                          </pre>
                        }
                      />
                    </div>

                    {/* Other bug cards */}
                    {getBugCards(bug).map((card, cardIndex) => (
                      <div
                        key={card.title}
                        className="animate-[fadeSlideIn_0.4s_ease-out_forwards] opacity-0"
                        style={{
                          animationDelay: `${(bugIndex * 7 + cardIndex + 3) * 200}ms`,
                        }}
                      >
                        <ResultCard
                          icon={card.icon}
                          title={card.title}
                          color={card.color}
                          content={
                            card.isCode ? (
                              <pre className="font-mono text-xs bg-zinc-950 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                                {card.content}
                              </pre>
                            ) : (
                              <p>{card.content}</p>
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                ))}

                {/* Roast Card */}
                <div
                  className="animate-[fadeSlideIn_0.4s_ease-out_forwards] opacity-0"
                  style={{
                    animationDelay: `${(result.bugs.length * 7 + 3) * 200}ms`,
                  }}
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
              </div>
            )}
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
