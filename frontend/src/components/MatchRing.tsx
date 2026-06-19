import { cn } from "@/lib/cn";

/** Animated SVG progress ring (CSS-only) showing a match percentage. */
export function MatchRing({
  percent,
  size = 56,
  toneClass = "text-primary",
}: {
  percent: number;
  size?: number;
  /** Color of the progress arc (defaults to the brand green). */
  toneClass?: string;
}) {
  const stroke = 13;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          className="match-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
        />
        <circle
          className={cn("match-ring-value", toneClass)}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-xs font-semibold tabular-nums">
        {percent}%
      </span>
    </div>
  );
}
