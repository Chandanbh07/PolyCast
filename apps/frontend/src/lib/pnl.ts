import type { OrderHistoryEntry, Position } from "./types";

/**
 * Net cash a user has put into a given market/side (Buy fills minus Sell
 * fills, in cents). This is the same approximation the backend's
 * /leaderboard endpoint uses for cost basis — derived from real
 * OrderHistory rows rather than a separately-tracked ledger, so it can
 * never drift out of sync with what actually happened.
 */
export function costBasisCents(history: OrderHistoryEntry[], marketId: string, type: Position["type"]): number {
  let cents = 0;
  for (const h of history) {
    if (h.marketId !== marketId || h.side !== type) continue;
    if (h.orderType !== "Buy" && h.orderType !== "Sell") continue;
    cents += (h.orderType === "Buy" ? 1 : -1) * h.price * h.qty;
  }
  return cents;
}

/** Cumulative net-invested series over time, for the portfolio chart. */
export function cumulativeInvestedSeries(history: OrderHistoryEntry[]): { time: string; invested: number }[] {
  const sorted = [...history]
    .filter((h) => h.orderType === "Buy" || h.orderType === "Sell")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  let running = 0;
  return sorted.map((h) => {
    running += (h.orderType === "Buy" ? 1 : -1) * h.price * h.qty;
    return { time: h.createdAt, invested: running / 100 };
  });
}
