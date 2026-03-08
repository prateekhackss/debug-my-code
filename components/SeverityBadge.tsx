"use client";

type SeverityTier = {
  bg: string;
  text: string;
  border: string;
  label: string;
  glow: string;
};

function getSeverityTier(score: number): SeverityTier {
  if (score === 10) {
    return {
      bg: "bg-red-500/20",
      text: "text-red-400",
      border: "border-red-500/50",
      label: "How is this running?",
      glow: "shadow-red-500/30 shadow-lg",
    };
  }
  if (score >= 7) {
    return {
      bg: "bg-red-500/15",
      text: "text-red-400",
      border: "border-red-500/40",
      label: "Critical",
      glow: "",
    };
  }
  if (score >= 4) {
    return {
      bg: "bg-yellow-500/15",
      text: "text-yellow-400",
      border: "border-yellow-500/40",
      label: "Moderate",
      glow: "",
    };
  }
  return {
    bg: "bg-green-500/15",
    text: "text-green-400",
    border: "border-green-500/40",
    label: "Minor",
    glow: "",
  };
}

interface SeverityBadgeProps {
  score: number;
  /** Compact pill mode vs full display */
  compact?: boolean;
}

export default function SeverityBadge({ score, compact = false }: SeverityBadgeProps) {
  const tier = getSeverityTier(score);
  const isPulsing = score === 10;

  if (compact) {
    return (
      <span
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
          text-xs font-bold border
          ${tier.bg} ${tier.text} ${tier.border}
          ${isPulsing ? "animate-pulse" : ""}
        `}
      >
        {score}/10
      </span>
    );
  }

  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center
        w-24 h-24 rounded-2xl border
        ${tier.bg} ${tier.text} ${tier.border} ${tier.glow}
        ${isPulsing ? "animate-pulse" : ""}
      `}
    >
      {/* Large score number */}
      <span className="text-3xl font-black leading-none">{score}</span>
      <span className="text-[9px] font-semibold uppercase tracking-wider mt-1.5 opacity-80 px-1 leading-tight">
        {tier.label}
      </span>
    </div>
  );
}
