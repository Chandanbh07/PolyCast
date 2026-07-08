import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Radio, BookOpen, History, ScrollText, Clock } from "lucide-react";
import { getChart, getMarket, getMarketStats, getOpenOrders, getPositions, getTrades } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { getMarketPricing } from "@/lib/orderbook";
import { getMarketMeta, formatEndDate } from "@/lib/marketMeta";
import { useAuth } from "@/context/AuthContext";
import { useMarketRealtime } from "@/lib/useMarketRealtime";
import { ProbabilityRing } from "@/components/markets/ProbabilityRing";
import { OrderbookView } from "@/components/market-detail/OrderbookView";
import { OrderTicket } from "@/components/market-detail/OrderTicket";
import { SplitMergeCard } from "@/components/market-detail/SplitMergeCard";
import { PriceChart } from "@/components/market-detail/PriceChart";
import { RecentTrades } from "@/components/market-detail/RecentTrades";
import { MarketStatsBar } from "@/components/market-detail/MarketStatsBar";
import { OpenOrdersList } from "@/components/market-detail/OpenOrdersList";
import { CommentsSection } from "@/components/market-detail/CommentsSection";
import { RelatedMarkets } from "@/components/market-detail/RelatedMarkets";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-mist-400" />
        <h3 className="font-display text-sm font-semibold text-mist-50">{title}</h3>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function MarketDetail() {
  const { marketId } = useParams<{ marketId: string }>();
  const { address } = useAuth();

  // Pushes live orderbook / stats / trade updates into the query cache for
  // everyone viewing this market — not just the person placing the order.
  useMarketRealtime(marketId);

  const { data: market, isLoading } = useQuery({
    queryKey: queryKeys.market(marketId!),
    queryFn: () => getMarket(marketId!),
    enabled: !!marketId,
    // Websocket keeps this fresh instantly; this is just a safety net for
    // environments where the socket can't connect (e.g. blocked by a proxy).
    refetchInterval: 8000,
  });

  const { data: trades, isLoading: tradesLoading } = useQuery({
    queryKey: queryKeys.trades(marketId!),
    queryFn: () => getTrades(marketId!),
    enabled: !!marketId,
    refetchInterval: 8000,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.stats(marketId!),
    queryFn: () => getMarketStats(marketId!),
    enabled: !!marketId,
    refetchInterval: 8000,
  });

  const { data: chartPoints, isLoading: chartLoading } = useQuery({
    queryKey: queryKeys.chart(marketId!),
    queryFn: () => getChart(marketId!),
    enabled: !!marketId,
    refetchInterval: 15000,
  });

  const { data: positions } = useQuery({
    queryKey: queryKeys.positions,
    queryFn: getPositions,
    enabled: !!address,
  });

  const { data: openOrders } = useQuery({
    queryKey: queryKeys.openOrders,
    queryFn: getOpenOrders,
    enabled: !!address,
    refetchInterval: 8000,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-4 h-64 rounded-2xl" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
        <p className="text-mist-300">Market not found.</p>
        <Link to="/markets" className="mt-3 inline-block text-sm text-signal-300">
          Back to markets
        </Link>
      </div>
    );
  }

  const pricing = getMarketPricing(market);
  const meta = getMarketMeta(market);
  const CategoryIcon = meta.category.icon;
  const yesQty = positions?.find((p) => p.marketId === market.id && p.type === "Yes")?.qty ?? 0;
  const noQty = positions?.find((p) => p.marketId === market.id && p.type === "No")?.qty ?? 0;
  const marketOpenOrders = (openOrders ?? []).filter((o) => o.marketId === market.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link to="/markets" className="flex items-center gap-1.5 text-sm text-mist-400 hover:text-mist-100">
        <ArrowLeft className="size-4" /> Markets
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Hero */}
          <div className="glass relative overflow-hidden rounded-2xl p-6">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-30"
              style={{
                background: `radial-gradient(90% 100% at 10% 0%, ${meta.category.accent}33, transparent 70%)`,
              }}
            />

            <div className="relative flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-600 bg-ink-900/60 px-2.5 py-1 text-[11px] font-medium text-mist-300">
                <CategoryIcon className="size-3" style={{ color: meta.category.accent }} />
                {meta.category.label}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-600 bg-ink-900/60 px-2.5 py-1 text-[11px] font-medium text-mist-300">
                <Clock className="size-3" />
                {market.resolution ? "Closed" : `Ends ${formatEndDate(meta.endDate)}`}
              </span>
              {!market.resolution && (
                <span className="ml-auto flex items-center gap-1.5 text-xs text-yes-400">
                  <Radio className="size-3 animate-pulse" /> Live
                </span>
              )}
              {market.resolution && (
                <Badge variant="signal" className="ml-auto">
                  <CheckCircle2 className="size-3" /> Resolved: {market.resolution}
                </Badge>
              )}
            </div>

            <div className="relative mt-4 flex items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl font-semibold leading-snug text-mist-50 sm:text-3xl">
                  {market.title}
                </h1>
                <p className="mt-2 text-sm text-mist-300">{market.description}</p>
              </div>
              <ProbabilityRing yesPrice={pricing.yesPrice} size={72} strokeWidth={7} />
            </div>

            <div className="relative mt-5 flex flex-wrap items-center gap-2">
              <Badge variant="yes">Yes {pricing.yesPrice}¢</Badge>
              <Badge variant="no">No {pricing.noPrice}¢</Badge>
              <span className="font-mono-nums text-xs text-mist-400">{market.totalQty.toLocaleString()} shares volume</span>
            </div>
          </div>

          <SectionCard icon={Radio} title="Price chart">
            <PriceChart points={chartPoints} currentYesPrice={pricing.yesPrice} isLoading={chartLoading} />
          </SectionCard>

          <div className="glass rounded-2xl p-4">
            <MarketStatsBar stats={stats} isLoading={statsLoading} />
          </div>

          {address && (yesQty > 0 || noQty > 0) && (
            <div className="glass rounded-2xl p-5">
              <h3 className="font-display text-sm font-semibold text-mist-50">Your position</h3>
              <div className="mt-3 flex gap-4">
                <div className="flex-1 rounded-xl bg-yes-500/10 p-3">
                  <p className="text-xs text-mist-400">Yes shares</p>
                  <p className="font-mono-nums text-lg font-semibold text-yes-400">{yesQty}</p>
                </div>
                <div className="flex-1 rounded-xl bg-no-500/10 p-3">
                  <p className="text-xs text-mist-400">No shares</p>
                  <p className="font-mono-nums text-lg font-semibold text-no-400">{noQty}</p>
                </div>
              </div>
            </div>
          )}

          <SectionCard icon={BookOpen} title="Order book">
            <OrderbookView yesBook={pricing.yesBook} noBook={pricing.noBook} />
          </SectionCard>

          <SectionCard icon={History} title="Recent trades">
            <RecentTrades trades={trades} isLoading={tradesLoading} />
          </SectionCard>

          {address && <OpenOrdersList orders={marketOpenOrders} />}

          <SectionCard icon={ScrollText} title="Resolution criteria">
            <p className="text-sm text-mist-300">{market.resolutionDescription}</p>
          </SectionCard>

          <CommentsSection marketId={market.id} />

          <RelatedMarkets market={market} />
        </div>

        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <OrderTicket
            marketId={market.id}
            yesPrice={pricing.yesPrice}
            noPrice={pricing.noPrice}
            yesQty={yesQty}
            noQty={noQty}
            resolved={!!market.resolution}
          />
          {!market.resolution && <SplitMergeCard marketId={market.id} />}
        </div>
      </div>
    </div>
  );
}
