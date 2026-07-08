import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Wallet2 } from "lucide-react";
import { getBalance, getHistory, getMarkets, getPositions } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { getMarketPricing } from "@/lib/orderbook";
import { costBasisCents } from "@/lib/pnl";
import { useAuth } from "@/context/AuthContext";
import { balanceToUsd, cn } from "@/lib/utils";
import { ConnectGate } from "@/components/shared/ConnectGate";
import { PositionCard } from "@/components/portfolio/PositionCard";
import { PortfolioChart } from "@/components/portfolio/PortfolioChart";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrderType, Position } from "@/lib/types";

const badgeVariant: Record<OrderType, "yes" | "no" | "signal" | "default"> = {
  Buy: "yes",
  Sell: "no",
  Split: "signal",
  Merge: "default",
};

export default function Portfolio() {
  const { address } = useAuth();

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: queryKeys.balance,
    queryFn: getBalance,
    enabled: !!address,
  });
  const { data: positions, isLoading: positionsLoading } = useQuery({
    queryKey: queryKeys.positions,
    queryFn: getPositions,
    enabled: !!address,
  });
  const { data: markets, isLoading: marketsLoading } = useQuery({
    queryKey: queryKeys.markets,
    queryFn: getMarkets,
    enabled: !!address,
  });
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: queryKeys.history,
    queryFn: getHistory,
    enabled: !!address,
  });

  const marketsById = useMemo(() => new Map((markets ?? []).map((m) => [m.id, m])), [markets]);

  const positionsByMarket = useMemo(() => {
    const map = new Map<string, { yes?: Position; no?: Position }>();
    for (const p of positions ?? []) {
      if (p.qty <= 0) continue;
      const entry = map.get(p.marketId) ?? {};
      if (p.type === "Yes") entry.yes = p;
      else entry.no = p;
      map.set(p.marketId, entry);
    }
    return map;
  }, [positions]);

  const openEntries = useMemo(
    () => Array.from(positionsByMarket.entries()).filter(([id]) => !marketsById.get(id)?.resolution),
    [positionsByMarket, marketsById]
  );
  const closedEntries = useMemo(
    () => Array.from(positionsByMarket.entries()).filter(([id]) => !!marketsById.get(id)?.resolution),
    [positionsByMarket, marketsById]
  );

  const { positionsValue, unrealizedPnl, realizedPnl } = useMemo(() => {
    let value = 0;
    let unrealized = 0;
    let realized = 0;
    for (const [marketId, entry] of positionsByMarket) {
      const market = marketsById.get(marketId);
      if (!market) continue;
      const pricing = getMarketPricing(market);
      const yesCost = (history ? costBasisCents(history, marketId, "Yes") : 0) / 100;
      const noCost = (history ? costBasisCents(history, marketId, "No") : 0) / 100;

      const yesQty = entry.yes?.qty ?? 0;
      const noQty = entry.no?.qty ?? 0;

      const yesValue = market.resolution ? (market.resolution === "Yes" ? yesQty : 0) : (yesQty * pricing.yesPrice) / 100;
      const noValue = market.resolution ? (market.resolution === "No" ? noQty : 0) : (noQty * pricing.noPrice) / 100;

      if (market.resolution) {
        realized += yesValue - yesCost + (noValue - noCost);
      } else {
        value += yesValue + noValue;
        unrealized += yesValue - yesCost + (noValue - noCost);
      }
    }
    return { positionsValue: value, unrealizedPnl: unrealized, realizedPnl: realized };
  }, [positionsByMarket, marketsById, history]);

  if (!address) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-semibold text-mist-50">Portfolio</h1>
        <ConnectGate label="portfolio" />
      </div>
    );
  }

  const loading = balanceLoading || positionsLoading || marketsLoading;
  const recentActivity = [...(history ?? [])].reverse().slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-mist-50">Portfolio</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass rounded-2xl p-5">
          <p className="flex items-center gap-1.5 text-xs text-mist-400">
            <Wallet2 className="size-3.5" /> Cash balance
          </p>
          <p className="font-mono-nums mt-2 text-2xl font-semibold text-mist-50">{balanceToUsd(balance)}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-xs text-mist-400">Open positions value</p>
          <p className="font-mono-nums mt-2 text-2xl font-semibold text-mist-50">${positionsValue.toFixed(2)}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-xs text-mist-400">Unrealized P&amp;L</p>
          <p className={cn("font-mono-nums mt-2 text-2xl font-semibold", unrealizedPnl >= 0 ? "text-yes-400" : "text-no-400")}>
            {unrealizedPnl >= 0 ? "+" : ""}${unrealizedPnl.toFixed(2)}
          </p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-xs text-mist-400">Realized P&amp;L</p>
          <p className={cn("font-mono-nums mt-2 text-2xl font-semibold", realizedPnl >= 0 ? "text-yes-400" : "text-no-400")}>
            {realizedPnl >= 0 ? "+" : ""}${realizedPnl.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-6 glass rounded-2xl p-6">
        <h2 className="font-display text-sm font-semibold text-mist-50">Net invested over time</h2>
        <p className="mt-1 text-xs text-mist-400">
          Cumulative cash you've put into positions — buys add, sells subtract.
        </p>
        <div className="mt-4">
          {historyLoading ? <Skeleton className="h-48 rounded-xl" /> : <PortfolioChart history={history ?? []} />}
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-mist-50">Open positions</h2>
        <span className="text-xs text-mist-400">{openEntries.length} markets</span>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        {!loading && openEntries.length === 0 && (
          <p className="col-span-full py-10 text-center text-mist-400">
            You don't hold any open positions yet. Head to Markets to place your first trade.
          </p>
        )}
        {!loading &&
          openEntries.map(([marketId, entry]) => {
            const market = marketsById.get(marketId);
            if (!market) return null;
            return (
              <PositionCard
                key={marketId}
                market={market}
                yesPosition={entry.yes}
                noPosition={entry.no}
                yesCostBasis={history ? costBasisCents(history, marketId, "Yes") / 100 : 0}
                noCostBasis={history ? costBasisCents(history, marketId, "No") / 100 : 0}
              />
            );
          })}
      </div>

      {closedEntries.length > 0 && (
        <>
          <div className="mt-10 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-mist-50">Closed positions</h2>
            <span className="text-xs text-mist-400">{closedEntries.length} markets</span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {closedEntries.map(([marketId, entry]) => {
              const market = marketsById.get(marketId);
              if (!market) return null;
              return (
                <PositionCard
                  key={marketId}
                  market={market}
                  yesPosition={entry.yes}
                  noPosition={entry.no}
                  yesCostBasis={history ? costBasisCents(history, marketId, "Yes") / 100 : 0}
                  noCostBasis={history ? costBasisCents(history, marketId, "No") / 100 : 0}
                />
              );
            })}
          </div>
        </>
      )}

      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-mist-50">Recent activity</h2>
        <Link to="/orders" className="text-sm font-medium text-signal-300 hover:text-signal-200">
          View all
        </Link>
      </div>
      <div className="glass mt-4 overflow-hidden rounded-2xl">
        {historyLoading &&
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="mx-5 my-2 h-10 rounded-lg" />)}
        {!historyLoading && recentActivity.length === 0 && (
          <p className="px-5 py-8 text-center text-mist-400">No activity yet.</p>
        )}
        {recentActivity.map((h) => (
          <Link
            key={h.id}
            to={`/markets/${h.marketId}`}
            className="flex items-center justify-between gap-3 border-b border-ink-800/60 px-5 py-3 text-sm last:border-b-0 hover:bg-ink-800/40"
          >
            <span className="flex items-center gap-2 truncate">
              {h.orderType === "Buy" ? (
                <ArrowUpRight className="size-3.5 shrink-0 text-yes-400" />
              ) : h.orderType === "Sell" ? (
                <ArrowDownRight className="size-3.5 shrink-0 text-no-400" />
              ) : (
                <Badge variant={badgeVariant[h.orderType]}>{h.orderType}</Badge>
              )}
              <span className="truncate text-mist-100">{marketsById.get(h.marketId)?.title ?? h.marketId}</span>
            </span>
            <span className="font-mono-nums shrink-0 text-mist-300">
              {h.price ? `${h.price}¢ × ${h.qty}` : h.qty}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
