import { Link } from "react-router-dom";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { Market, Position } from "@/lib/types";
import { getMarketPricing } from "@/lib/orderbook";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function Leg({
  label,
  qty,
  currentValue,
  costBasis,
  accent,
}: {
  label: string;
  qty: number;
  currentValue: number; // dollars
  costBasis: number; // dollars
  accent: "yes" | "no";
}) {
  const pnl = currentValue - costBasis;
  const pnlPositive = pnl >= 0;
  return (
    <div className={cn("rounded-xl p-3", accent === "yes" ? "bg-yes-500/10" : "bg-no-500/10")}>
      <p className="text-xs text-mist-400">
        {label} · {qty} sh
      </p>
      <p className={cn("font-mono-nums text-base font-semibold", accent === "yes" ? "text-yes-400" : "text-no-400")}>
        ${currentValue.toFixed(2)}
      </p>
      {costBasis > 0 && (
        <p className={cn("mt-0.5 flex items-center gap-1 font-mono-nums text-[11px]", pnlPositive ? "text-yes-400/80" : "text-no-400/80")}>
          {pnlPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
          {pnlPositive ? "+" : ""}${pnl.toFixed(2)}
        </p>
      )}
    </div>
  );
}

export function PositionCard({
  market,
  yesPosition,
  noPosition,
  yesCostBasis = 0,
  noCostBasis = 0,
}: {
  market: Market;
  yesPosition?: Position;
  noPosition?: Position;
  /** dollars already put into this leg, derived from the user's own trade history */
  yesCostBasis?: number;
  noCostBasis?: number;
}) {
  const pricing = getMarketPricing(market);
  const yesQty = yesPosition?.qty ?? 0;
  const noQty = noPosition?.qty ?? 0;

  // On a resolved market, a winning share is worth $1 and a losing one $0 —
  // that's the actual settlement value, not the last traded price.
  const yesValue = market.resolution
    ? market.resolution === "Yes"
      ? yesQty
      : 0
    : (yesQty * pricing.yesPrice) / 100;
  const noValue = market.resolution
    ? market.resolution === "No"
      ? noQty
      : 0
    : (noQty * pricing.noPrice) / 100;

  return (
    <Link to={`/markets/${market.id}`} className="glass glass-hover block rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-sm font-semibold text-mist-50 line-clamp-2">{market.title}</h3>
        {market.resolution && <Badge variant="signal">Resolved · {market.resolution}</Badge>}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {yesQty > 0 && <Leg label="Yes" qty={yesQty} currentValue={yesValue} costBasis={yesCostBasis} accent="yes" />}
        {noQty > 0 && <Leg label="No" qty={noQty} currentValue={noValue} costBasis={noCostBasis} accent="no" />}
      </div>
    </Link>
  );
}
