import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getHistory, getMarkets } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { useAuth } from "@/context/AuthContext";
import { ConnectGate } from "@/components/shared/ConnectGate";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrderType } from "@/lib/types";

const badgeVariant: Record<OrderType, "yes" | "no" | "signal" | "default"> = {
  Buy: "yes",
  Sell: "no",
  Split: "signal",
  Merge: "default",
};

export default function Orders() {
  const { address } = useAuth();

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: queryKeys.history,
    queryFn: getHistory,
    enabled: !!address,
  });
  const { data: markets } = useQuery({ queryKey: queryKeys.markets, queryFn: getMarkets, enabled: !!address });

  const marketsById = useMemo(() => new Map((markets ?? []).map((m) => [m.id, m])), [markets]);

  if (!address) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-mist-50">Orders</h1>
        <ConnectGate label="order history" />
      </div>
    );
  }

  const sorted = [...(history ?? [])].reverse();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-[-0.02em] text-mist-50">Order history</h1>

      <div className="glass mt-6 overflow-hidden rounded-3xl">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b border-white/[0.06] px-5 py-3 text-xs font-medium text-mist-400">
          <span>Market</span>
          <span className="text-right">Type</span>
          <span className="text-right">Price</span>
          <span className="text-right">Qty</span>
        </div>

        {historyLoading &&
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="mx-5 my-2 h-10 rounded-xl" />)}

        {!historyLoading && sorted.length === 0 && (
          <p className="px-5 py-10 text-center text-mist-400">No orders yet.</p>
        )}

        {sorted.map((h) => (
          <Link
            key={h.id}
            to={`/markets/${h.marketId}`}
            className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-white/[0.06] px-5 py-3 text-sm transition-colors last:border-b-0 hover:bg-white/[0.03]"
          >
            <span className="truncate text-mist-100">{marketsById.get(h.marketId)?.title ?? h.marketId}</span>
            <span className="text-right">
              <Badge variant={badgeVariant[h.orderType]}>{h.orderType}</Badge>
            </span>
            <span className="font-mono-nums text-right text-mist-300">{h.price ? `${h.price}¢` : "—"}</span>
            <span className="font-mono-nums text-right text-mist-100">{h.qty}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}