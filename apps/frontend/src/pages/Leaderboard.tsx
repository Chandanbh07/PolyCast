import { useQuery } from "@tanstack/react-query";
import { Trophy, Medal } from "lucide-react";
import { getLeaderboard } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { useAuth } from "@/context/AuthContext";
import { balanceToUsd, truncateAddress, cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const RANK_STYLES = [
  "text-[#e2c15a]", // gold — cool-friendly, restrained
  "text-mist-200",  // silver
  "text-[#b8875a]", // bronze — muted, sits on the cool base without clashing
];

export default function Leaderboard() {
  const { address } = useAuth();
  const { data: entries, isLoading } = useQuery({
    queryKey: queryKeys.leaderboard,
    queryFn: getLeaderboard,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-2.5">
        <Trophy className="size-6 text-signal-400" />
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-mist-50">Leaderboard</h1>
      </div>
      <p className="mt-1.5 text-sm text-mist-400 leading-relaxed">
        Ranked by realized profit on resolved markets — payout at settlement minus what each trader
        actually put in.
      </p>

      <div className="glass mt-6 overflow-hidden rounded-3xl">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 border-b border-white/[0.06] px-5 py-3 text-xs font-medium text-mist-400">
          <span className="w-8">#</span>
          <span>Trader</span>
          <span className="text-right">Volume</span>
          <span className="text-right">Win rate</span>
          <span className="text-right">Profit / ROI</span>
        </div>

        {isLoading &&
          Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="mx-5 my-2 h-12 rounded-xl" />)}

        {!isLoading && entries?.length === 0 && (
          <p className="px-5 py-14 text-center text-mist-400">
            No ranked traders yet — profit is computed once markets resolve.
          </p>
        )}

        {entries?.map((e, i) => {
          const isMe = address && e.address.toLowerCase() === address.toLowerCase();
          const positive = e.profit >= 0;
          return (
            <div
              key={e.userId}
              className={cn(
                "grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 border-b border-white/[0.06] px-5 py-3.5 text-sm transition-colors last:border-b-0",
                isMe ? "bg-signal-500/[0.06]" : "hover:bg-white/[0.02]"
              )}
            >
              <span className={cn("w-8 font-mono-nums font-semibold", RANK_STYLES[i] ?? "text-mist-400")}>
                {i < 3 ? <Medal className="size-4" /> : i + 1}
              </span>
              <span className="flex items-center gap-2 truncate font-mono-nums text-mist-100">
                {truncateAddress(e.address)}
                {isMe && <span className="rounded-full bg-signal-500/15 px-2 py-0.5 text-[10px] text-signal-300">You</span>}
              </span>
              <span className="text-right font-mono-nums text-mist-300">{e.volume.toLocaleString()} sh</span>
              <span className="text-right font-mono-nums text-mist-300">
                {e.resolvedPositions > 0 ? `${Math.round(e.winRate * 100)}%` : "—"}
              </span>
              <span className="text-right">
                <div className={cn("font-mono-nums font-semibold", positive ? "text-yes-400" : "text-no-400")}>
                  {positive ? "+" : ""}
                  {balanceToUsd(e.profit)}
                </div>
                <div className={cn("font-mono-nums text-xs", positive ? "text-yes-400/70" : "text-no-400/70")}>
                  {e.resolvedPositions > 0 ? `${positive ? "+" : ""}${(e.roi * 100).toFixed(0)}% ROI` : "—"}
                </div>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}