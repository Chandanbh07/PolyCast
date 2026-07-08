import { cn } from "@/lib/utils";

/**
 * Signature element: a probability ring derived from live orderbook pricing
 * (see lib/orderbook.ts::getMarketPricing). Reads as an instrument gauge,
 * not decoration — the arc length *is* the yes-probability.
 */
export function ProbabilityRing({
  yesPrice,
  size = 64,
  strokeWidth = 6,
}: {
  yesPrice: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - yesPrice / 100);
  const isBullish = yesPrice >= 50;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-ink-700)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isBullish ? "var(--color-yes-500)" : "var(--color-no-500)"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            "font-mono-nums text-sm font-semibold",
            isBullish ? "text-yes-400" : "text-no-400"
          )}
        >
          {yesPrice}%
        </span>
      </div>
    </div>
  );
}
