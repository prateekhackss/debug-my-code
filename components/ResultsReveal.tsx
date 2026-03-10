"use client";

import { useState, useEffect } from "react";
import HealthScore from "@/components/HealthScore";
import BugCounter from "@/components/BugCounter";
import ResultCard from "@/components/ResultCard";
import SeverityBadge from "@/components/SeverityBadge";
import CodeEditor from "@/components/CodeEditor";
import { DebugResponse, SupportedLanguage, Bug } from "@/types";

// --- Helpers ---
function getAllLineNumbers(code: string): number[] {
    if (!code) return [];
    return code.split("\n").map((_, i) => i + 1);
}

function getBugCards(bug: Bug) {
    return [
        { icon: "📍", title: "Bug Location", content: bug.location, color: "red" as const },
        { icon: "💥", title: "What Goes Wrong", content: bug.what_goes_wrong, color: "yellow" as const },
        { icon: "🎯", title: "Intent vs Reality", content: bug.intent_vs_reality, color: "orange" as const },
        { icon: "💡", title: "Why This Fixes It", content: bug.why_this_fixes_it, color: "green" as const },
        { icon: "📚", title: "Lesson", content: bug.lesson, color: "blue" as const },
    ];
}

// --- Build a flat list of reveal steps ---
interface RevealStep {
    type: "health" | "bugCounter" | "bugHeader" | "diff" | "card" | "roast";
    bugIndex?: number;
    cardIndex?: number;
}

function buildRevealSteps(bugCount: number): RevealStep[] {
    const steps: RevealStep[] = [];

    // Step 0: Health score
    steps.push({ type: "health" });

    // Step 1: Bug counter
    steps.push({ type: "bugCounter" });

    // Per bug: header + diff + 5 cards = 7 steps each
    for (let i = 0; i < bugCount; i++) {
        steps.push({ type: "bugHeader", bugIndex: i });
        steps.push({ type: "diff", bugIndex: i });
        for (let c = 0; c < 5; c++) {
            steps.push({ type: "card", bugIndex: i, cardIndex: c });
        }
    }

    // Last: roast
    steps.push({ type: "roast" });

    return steps;
}

// --- Component ---
interface ResultsRevealProps {
    result: DebugResponse;
    language: SupportedLanguage;
}

const STEP_DELAY = 400; // ms between each reveal

export default function ResultsReveal({ result, language }: ResultsRevealProps) {
    const steps = buildRevealSteps(result.bugs.length);
    const [visibleCount, setVisibleCount] = useState(0);

    // Health score calculation
    const bugCount = result.bugs.length;
    const healthScore =
        bugCount === 0
            ? 10
            : Math.max(
                1,
                Math.round(
                    10 - result.bugs.reduce((sum, b) => sum + b.severity, 0) / bugCount
                )
            );

    // Progressive reveal chain
    useEffect(() => {
        setVisibleCount(0);

        const timeouts: ReturnType<typeof setTimeout>[] = [];

        for (let i = 0; i < steps.length; i++) {
            timeouts.push(
                setTimeout(() => {
                    setVisibleCount(i + 1);
                }, i * STEP_DELAY)
            );
        }

        return () => timeouts.forEach(clearTimeout);
    }, [result, steps.length]);

    const isRevealing = visibleCount < steps.length;

    // Helper: is step N visible?
    const isVisible = (stepIndex: number) => stepIndex < visibleCount;

    // Track which step index we're at for each element
    let stepCounter = 0;

    return (
        <div className="mt-10 space-y-6">
            {/* Health Score */}
            <div
                className={`p-6 rounded-xl bg-zinc-900 border border-zinc-800 transition-all duration-500 ease-out ${isVisible(stepCounter)
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-3"
                    }`}
            >
                <HealthScore score={healthScore} summary={result.overall_summary} />
            </div>
            {(() => { stepCounter++; return null; })()}

            {/* Bug Counter */}
            <div
                className={`transition-all duration-500 ease-out ${isVisible(stepCounter)
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-3"
                    }`}
            >
                <BugCounter count={bugCount} />
            </div>
            {(() => { stepCounter++; return null; })()}

            {/* Bug Cards */}
            {result.bugs.map((bug, bugIndex) => {
                const cards = getBugCards(bug);
                const headerStep = stepCounter;
                stepCounter++;
                const diffStep = stepCounter;
                stepCounter++;

                return (
                    <div key={bug.id} className="space-y-3">
                        {/* Bug header */}
                        <div
                            className={`flex items-center gap-3 transition-all duration-500 ease-out ${isVisible(headerStep)
                                    ? "opacity-100 translate-y-0"
                                    : "opacity-0 translate-y-3"
                                }`}
                        >
                            <SeverityBadge score={bug.severity} compact />
                            <h3 className="text-base font-bold text-zinc-200">
                                Bug #{bug.id}: {bug.title}
                            </h3>
                        </div>

                        {/* Side-by-side diff */}
                        <div
                            className={`grid grid-cols-1 lg:grid-cols-2 gap-3 transition-all duration-500 ease-out ${isVisible(diffStep)
                                    ? "opacity-100 translate-y-0"
                                    : "opacity-0 translate-y-3"
                                }`}
                        >
                            <div>
                                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-red-400 uppercase tracking-wide">
                                    <span>🐛</span> Broken Code
                                </div>
                                <CodeEditor
                                    value={bug.broken_code}
                                    language={language}
                                    readOnly
                                    highlightLines={getAllLineNumbers(bug.broken_code)}
                                    highlightColor="red"
                                    minHeight={80}
                                />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-green-400 uppercase tracking-wide">
                                    <span>✅</span> Fixed Code
                                </div>
                                <CodeEditor
                                    value={bug.fixed_code}
                                    language={language}
                                    readOnly
                                    highlightLines={getAllLineNumbers(bug.fixed_code)}
                                    highlightColor="green"
                                    minHeight={80}
                                />
                            </div>
                        </div>

                        {/* Result cards */}
                        {cards.map((card, cardIndex) => {
                            const cardStep = diffStep + 1 + cardIndex;
                            if (cardIndex === cards.length - 1) {
                                stepCounter = cardStep + 1;
                            }

                            return (
                                <div
                                    key={card.title}
                                    className={`transition-all duration-500 ease-out ${isVisible(cardStep)
                                            ? "opacity-100 translate-y-0"
                                            : "opacity-0 translate-y-3"
                                        }`}
                                >
                                    <ResultCard
                                        icon={card.icon}
                                        title={card.title}
                                        color={card.color}
                                        content={<p>{card.content}</p>}
                                    />
                                </div>
                            );
                        })}
                    </div>
                );
            })}

            {/* Roast Card */}
            <div
                className={`transition-all duration-500 ease-out ${isVisible(stepCounter)
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-3"
                    }`}
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

            {/* Blinking typing cursor — visible while revealing */}
            {isRevealing && (
                <div className="flex justify-center">
                    <span
                        className="text-orange-500 text-2xl font-light select-none"
                        style={{ animation: "blinkCursor 0.5s step-end infinite" }}
                    >
                        |
                    </span>
                </div>
            )}
        </div>
    );
}
