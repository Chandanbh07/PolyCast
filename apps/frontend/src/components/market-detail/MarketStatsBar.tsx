import { Droplets, LineChart, Users } from "lucide-react";
import type { MarketStats } from "@/lib/types";

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-ink-900/50 px-3.5 py-2.5">
      <span className="text-mist-400">{icon}</span>
      <div>
        <p className="text-[11px] leading-none text-mist-400">{label}</p>
        <p className="font-mono-nums mt-1 text-sm font-semibold text-mist-50">{value}</p>
      </div>
    </div>
  );
}

export function MarketStatsBar({ stats, isLoading }: { stats: MarketStats | undefined; isLoading?: boolean }) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-ink-800/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      <Stat icon={<LineChart className="size-4" />} label="Volume (shares)" value={stats.volume.toLocaleString()} />
      <Stat icon={<Droplets className="size-4" />} label="Liquidity" value={`$${stats.liquidity.toFixed(2)}`} />
      <Stat icon={<Users className="size-4" />} label="Holders" value={stats.traders.toLocaleString()} />
    </div>
  );
}
