"use client";

interface BugCounterProps {
    count: number;
}

function getBugConfig(count: number) {
    if (count === 0) {
        return {
            icon: "✅",
            text: "Clean code!",
            color: "text-green-400",
            bg: "bg-green-500/10 border-green-500/20",
        };
    }
    if (count <= 2) {
        return {
            icon: "⚠️",
            text: `Found ${count} bug${count > 1 ? "s" : ""}`,
            color: "text-yellow-400",
            bg: "bg-yellow-500/10 border-yellow-500/20",
        };
    }
    if (count <= 5) {
        return {
            icon: "🔥",
            text: `Found ${count} bugs`,
            color: "text-orange-400",
            bg: "bg-orange-500/10 border-orange-500/20",
        };
    }
    return {
        icon: "💀",
        text: `Found ${count} bugs — we need to talk`,
        color: "text-red-400",
        bg: "bg-red-500/10 border-red-500/20",
    };
}

export default function BugCounter({ count }: BugCounterProps) {
    const config = getBugConfig(count);

    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${config.bg}`}>
            <span className="text-2xl">{config.icon}</span>
            <div>
                <p className={`text-sm font-bold ${config.color}`}>{config.text}</p>
                <p className="text-xs text-zinc-500">
                    {count === 0
                        ? "No issues detected"
                        : `Ordered by severity (highest first)`}
                </p>
            </div>
            {count > 0 && (
                <div className={`ml-auto text-3xl font-black ${config.color}`}>
                    {count}
                </div>
            )}
        </div>
    );
}
