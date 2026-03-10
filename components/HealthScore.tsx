"use client";

interface HealthScoreProps {
    score: number;
    summary: string;
}

function getScoreConfig(score: number) {
    if (score >= 8) {
        return {
            label: "Solid",
            color: "#22c55e",       // green-500
            trackColor: "#22c55e20",
            textColor: "text-green-400",
            bgColor: "bg-green-500/10",
        };
    }
    if (score >= 5) {
        return {
            label: "Needs work",
            color: "#eab308",       // yellow-500
            trackColor: "#eab30820",
            textColor: "text-yellow-400",
            bgColor: "bg-yellow-500/10",
        };
    }
    if (score >= 3) {
        return {
            label: "Concerning",
            color: "#f97316",       // orange-500
            trackColor: "#f9731620",
            textColor: "text-orange-400",
            bgColor: "bg-orange-500/10",
        };
    }
    return {
        label: "Start over",
        color: "#ef4444",         // red-500
        trackColor: "#ef444420",
        textColor: "text-red-400",
        bgColor: "bg-red-500/10",
    };
}

export default function HealthScore({ score, summary }: HealthScoreProps) {
    const config = getScoreConfig(score);

    // SVG ring: radius 54, circumference = 2 * PI * 54 ≈ 339.29
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 10) * circumference;
    const offset = circumference - progress;

    return (
        <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Circular score ring */}
            <div className="relative w-32 h-32 flex-shrink-0">
                <svg
                    className="w-32 h-32 -rotate-90"
                    viewBox="0 0 120 120"
                >
                    {/* Background track */}
                    <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="none"
                        stroke={config.trackColor}
                        strokeWidth="8"
                    />
                    {/* Progress arc */}
                    <circle
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="none"
                        stroke={config.color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>

                {/* Score number in center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-black ${config.textColor}`}>
                        {score}
                    </span>
                    <span className="text-zinc-500 text-xs font-medium">/10</span>
                </div>
            </div>

            {/* Label + summary */}
            <div className="text-center sm:text-left">
                <h2 className="text-lg font-bold text-zinc-100">Code Health Score</h2>
                <p className={`text-sm font-semibold mt-1 ${config.textColor}`}>
                    {config.label}
                </p>
                <p className="text-zinc-400 text-sm mt-2 max-w-sm">
                    {summary}
                </p>
            </div>
        </div>
    );
}
