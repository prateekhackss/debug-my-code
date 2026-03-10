"use client";

import { useState, useEffect, useCallback } from "react";
import CodeInput from "@/components/CodeInput";
import LoadingState from "@/components/LoadingState";
import ResultsReveal from "@/components/ResultsReveal";
import { DebugResponse, SupportedLanguage } from "@/types";

// --- Rate Limiting Helpers ---
const DAILY_LIMIT = 5;
const STORAGE_KEY_COUNT = "debugCount";
const STORAGE_KEY_DATE = "debugDate";

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

function getRateLimit(): { count: number; remaining: number; isLimited: boolean } {
  if (typeof window === "undefined") return { count: 0, remaining: DAILY_LIMIT, isLimited: false };

  const storedDate = localStorage.getItem(STORAGE_KEY_DATE);
  const today = getTodayString();

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

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DebugResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState({ count: 0, remaining: DAILY_LIMIT, isLimited: false });
  const [submittedLanguage, setSubmittedLanguage] = useState<SupportedLanguage>("javascript");

  useEffect(() => {
    setRateLimit(getRateLimit());
  }, []);

  const handleSubmit = useCallback(
    async (code: string, language: SupportedLanguage, context: string) => {
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
            <CodeInput onSubmit={handleSubmit} isLoading={isLoading} />

            {isLoading && <LoadingState />}

            {error && (
              <div className="mt-8 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                <span className="font-bold">Error:</span> {error}
              </div>
            )}

            {result && !isLoading && (
              <ResultsReveal result={result} language={submittedLanguage} />
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
