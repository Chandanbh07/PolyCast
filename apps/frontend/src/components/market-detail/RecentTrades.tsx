import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Trade } from "@/lib/types";
import { cn } from "@/lib/utils";

function timeAgo(iso: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function RecentTrades({ trades, isLoading }: { trades: Trade[] | undefined; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-lg bg-ink-800/60" />
        ))}
      </div>
    );
  }

  if (!trades || trades.length === 0) {
    return <p className="py-8 text-center text-sm text-mist-400">No trades yet — be the first to trade this market.</p>;
  }

  return (
    <div className="max-h-80 overflow-y-auto">
      <div className="mb-2 grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-1 text-xs font-medium text-mist-400">
        <span className="w-14">Side</span>
        <span>Type</span>
        <span className="text-right">Price</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Time</span>
      </div>
      <div className="space-y-1">
        {trades.map((t) => (
          <div
            key={t.id}
            className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 rounded-lg px-1 py-1.5 text-sm hover:bg-ink-800/40"
          >
            <span
              className={cn(
                "w-14 rounded-md px-1.5 py-0.5 text-center text-xs font-semibold",
                t.side === "Yes" ? "bg-yes-500/10 text-yes-400" : "bg-no-500/10 text-no-400"
              )}
            >
              {t.side}
            </span>
            <span className="flex items-center gap-1 text-mist-300">
              {t.orderType === "Buy" ? (
                <ArrowUpRight className="size-3.5 text-yes-400" />
              ) : (
                <ArrowDownRight className="size-3.5 text-no-400" />
              )}
              {t.orderType}
            </span>
            <span className="font-mono-nums text-right text-mist-50">{t.price}¢</span>
            <span className="font-mono-nums text-right text-mist-300">{t.qty}</span>
            <span className="text-right text-xs text-mist-400">{timeAgo(t.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
