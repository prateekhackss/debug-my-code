"use client";

import { ReactNode } from "react";

// Color variants matching the debug step types
export type CardColor = "red" | "yellow" | "orange" | "green" | "blue" | "purple";

const COLOR_STYLES: Record<CardColor, { bg: string; border: string; title: string; bar: string }> = {
  red: {
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    title: "text-red-400",
    bar: "bg-red-500",
  },
  yellow: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    title: "text-yellow-400",
    bar: "bg-yellow-500",
  },
  orange: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    title: "text-orange-400",
    bar: "bg-orange-500",
  },
  green: {
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    title: "text-green-400",
    bar: "bg-green-500",
  },
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    title: "text-blue-400",
    bar: "bg-blue-500",
  },
  purple: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    title: "text-purple-400",
    bar: "bg-purple-500",
  },
};

interface ResultCardProps {
  icon: string;
  title: string;
  content: ReactNode;
  color: CardColor;
  /** Optional delay for staggered animation (in ms) */
  delay?: number;
}

export default function ResultCard({ icon, title, content, color, delay = 0 }: ResultCardProps) {
  const styles = COLOR_STYLES[color];

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border
        ${styles.bg} ${styles.border}
        animate-[fadeSlideIn_0.4s_ease-out_forwards]
        opacity-0
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Left color bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${styles.bar}`} />

      <div className="pl-5 pr-4 py-4">
        {/* Icon + Title row */}
        <div className={`flex items-center gap-2 mb-2 font-bold text-sm ${styles.title}`}>
          <span className="text-base">{icon}</span>
          <span className="uppercase tracking-wide">{title}</span>
        </div>

        {/* Content area */}
        <div className="text-zinc-300 text-sm leading-relaxed">
          {content}
        </div>
      </div>
    </div>
  );
}
