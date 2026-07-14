import type { OpenOrder } from "@/lib/types";
import { cn } from "@/lib/utils";

export function OpenOrdersList({ orders }: { orders: OpenOrder[] }) {
  if (orders.length === 0) return null;

  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-mist-50">Your open orders</h3>
        <span className="text-xs text-mist-400">{orders.length} resting</span>
      </div>
      <div className="mt-3 space-y-1.5">
        {orders.map((o) => (
          <div
            key={o.originalOrderId}
            className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm"
          >
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-xs font-semibold",
                  o.side === "Yes" ? "bg-yes-500/10 text-yes-400" : "bg-no-500/10 text-no-400"
                )}
              >
                Sell {o.side}
              </span>
              {o.auto && <span className="text-xs text-mist-400">(auto, from opposite buy)</span>}
            </span>
            <span className="font-mono-nums text-mist-300">
              {o.qty} @ {o.price}¢
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-mist-400">
        These are resting limit orders waiting to be matched — they'll fill automatically as counter-orders come in.
      </p>
    </div>
  );
}