import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, Users, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { Market } from "@/lib/types";
import { getMarketPricing } from "@/lib/orderbook";
import { getMarketMeta, formatCompactUsd, formatEndDate } from "@/lib/marketMeta";
import { cn } from "@/lib/utils";
import { ProbabilityRing } from "./ProbabilityRing";
import { Badge } from "@/components/ui/badge";

export function MarketCard({ market, index = 0 }: { market: Market; index?: number }) {
  const pricing = getMarketPricing(market);
  const meta = getMarketMeta(market);
  const isResolved = !!market.resolution;
  const Icon = meta.category.icon;
  const isUp = meta.change24h >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
      whileHover={{ y: -4 }}
      className="group relative h-full"
    >
      <Link
        to={`/markets/${market.id}`}
        className="glass glass-hover relative flex h-full flex-col overflow-hidden rounded-2xl p-5"
      >
        {/* Category-tinted top accent, brightens on hover */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-40 transition-opacity duration-300 group-hover:opacity-70"
          style={{
            background: `radial-gradient(120% 100% at 15% 0%, ${meta.category.accent}33, transparent 70%)`,
          }}
        />

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-ink-600 bg-ink-900/60 px-2.5 py-1 text-[11px] font-medium text-mist-300">
            <Icon className="size-3" style={{ color: meta.category.accent }} />
            {meta.category.label}
          </div>
          {meta.trending && !isResolved && (
            <Badge variant="no" className="gap-1 border-none bg-gradient-to-r from-no-500/20 to-orange-400/20 text-orange-300">
              <Flame className="size-3" />
              Trending
            </Badge>
          )}
        </div>

        <div className="relative mt-3 flex items-start justify-between gap-3">
          <h3 className="font-display text-base font-semibold leading-snug text-mist-50 line-clamp-3">
            {market.title}
          </h3>
          <ProbabilityRing yesPrice={pricing.yesPrice} size={52} strokeWidth={5} />
        </div>

        <p className="relative mt-2.5 line-clamp-2 text-sm text-mist-400">{market.description}</p>

        <div className="relative mt-4 flex items-center gap-2">
          <Badge variant="yes">Yes {pricing.yesPrice}¢</Badge>
          <Badge variant="no">No {pricing.noPrice}¢</Badge>
          <span
            className={cn(
              "ml-auto flex items-center gap-0.5 font-mono-nums text-xs font-medium",
              isUp ? "text-yes-400" : "text-no-400"
            )}
          >
            {isUp ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {Math.abs(meta.change24h)}%
          </span>
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-y-1.5 border-t border-ink-700/80 pt-3 text-xs text-mist-400">
          <span className="font-mono-nums">{formatCompactUsd(market.totalQty)} vol</span>
          <span className="font-mono-nums text-right">{formatCompactUsd(meta.liquidity)} liq</span>
          <span className="flex items-center gap-1">
            <Users className="size-3" />
            {meta.participants.toLocaleString()}
          </span>
          <span className="flex items-center justify-end gap-1">
            <Clock className="size-3" />
            {isResolved ? "Closed" : formatEndDate(meta.endDate)}
          </span>
        </div>

        {isResolved && (
          <div className="relative mt-3">
            <Badge variant="signal">Resolved: {market.resolution}</Badge>
          </div>
        )}
        {!isResolved && meta.status === "Closing soon" && (
          <div className="relative mt-3">
            <Badge variant="outline" className="text-orange-300 border-orange-400/30">
              Closing soon
            </Badge>
          </div>
        )}
      </Link>
    </motion.div>
  );
}
