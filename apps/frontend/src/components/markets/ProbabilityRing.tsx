import { motion } from "framer-motion";
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
  const color = isBullish ? "var(--color-yes-500)" : "var(--color-no-500)";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {/* Soft outcome-tinted glow behind the arc */}
      <div
        className="absolute inset-0 rounded-full opacity-40 blur-md"
        style={{ background: isBullish ? "var(--color-yes-glow)" : "var(--color-no-glow)" }}
      />
      <svg width={size} height={size} className="relative -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-ink-700)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn("font-mono-nums text-sm font-semibold", isBullish ? "text-yes-400" : "text-no-400")}>
          {yesPrice}%
        </span>
      </div>
    </div>
  );
}