import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Layers, Radio, Timer } from "lucide-react";
import { getMarkets } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { getMarketPricing } from "@/lib/orderbook";
import { getMarketMeta, formatCompactUsd } from "@/lib/marketMeta";
import { MarketCard } from "@/components/markets/MarketCard";
import { CategoryRail } from "@/components/markets/CategoryRail";
import { ProbabilityRing } from "@/components/markets/ProbabilityRing";
import { AmbientField } from "@/components/shared/AmbientField";
import { CountUp } from "@/components/shared/CountUp";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Radio,
    title: "Live orderbooks",
    body: "Every market runs on a real price-time matching engine — not a synthetic curve.",
  },
  {
    icon: Timer,
    title: "Instant settlement",
    body: "Trades clear the moment they match. Positions and balances update immediately.",
  },
  {
    icon: Layers,
    title: "Split & merge",
    body: "Mint a full Yes/No pair from cash, or redeem a pair back to cash, any time.",
  },
];

export default function Home() {
  const { data: markets, isLoading } = useQuery({ queryKey: queryKeys.markets, queryFn: getMarkets });

  const open = useMemo(() => (markets ?? []).filter((m) => !m.resolution), [markets]);
  const resolved = useMemo(() => (markets ?? []).filter((m) => !!m.resolution), [markets]);

  const trending = useMemo(() => {
    const withMeta = open.map((m) => ({ market: m, meta: getMarketMeta(m) }));
    return withMeta
      .sort((a, b) => (b.meta.trending ? 1 : 0) - (a.meta.trending ? 1 : 0) || b.market.totalQty - a.market.totalQty)
      .slice(0, 3)
      .map((w) => w.market);
  }, [open]);

  const closingSoon = useMemo(() => {
    return open
      .map((m) => ({ market: m, meta: getMarketMeta(m) }))
      .filter((w) => w.meta.endDate)
      .sort((a, b) => a.meta.daysLeft - b.meta.daysLeft)
      .slice(0, 3)
      .map((w) => w.market);
  }, [open]);

  const heroMarket = trending[0] ?? open[0];
  const heroPricing = heroMarket ? getMarketPricing(heroMarket) : null;

  const totalVolume = useMemo(() => (markets ?? []).reduce((s, m) => s + m.totalQty, 0), [markets]);
  const totalParticipants = useMemo(
    () => open.reduce((s, m) => s + getMarketMeta(m).participants, 0),
    [open]
  );

  return (
    <div>
      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden">
        <AmbientField />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 pt-20 pb-20 sm:px-6 sm:pt-28 sm:pb-28 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-signal-500/30 bg-signal-500/10 px-3 py-1 text-xs font-medium text-signal-300">
              Prediction markets, priced in real time
            </span>
            <h1 className="font-display mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-mist-50 sm:text-6xl">
              Trade what you believe will happen.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-mist-300">
              PolyCast turns your conviction into a position. Buy Yes or No on real-world outcomes,
              backed by a live orderbook and settled in seconds.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/markets">
                  Explore markets <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/portfolio">View portfolio</Link>
              </Button>
            </div>

            <div className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-ink-800/80 pt-6">
              <div>
                <div className="font-display font-mono-nums text-2xl font-semibold text-mist-50">
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <CountUp value={totalVolume} format={(n) => formatCompactUsd(n)} />
                  )}
                </div>
                <div className="mt-1 text-xs text-mist-400">Total volume</div>
              </div>
              <div>
                <div className="font-display font-mono-nums text-2xl font-semibold text-mist-50">
                  {isLoading ? <Skeleton className="h-8 w-12" /> : <CountUp value={open.length} />}
                </div>
                <div className="mt-1 text-xs text-mist-400">Active markets</div>
              </div>
              <div>
                <div className="font-display font-mono-nums text-2xl font-semibold text-mist-50">
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <CountUp value={totalParticipants} format={(n) => Math.round(n).toLocaleString()} />
                  )}
                </div>
                <div className="mt-1 text-xs text-mist-400">Traders</div>
              </div>
            </div>
          </motion.div>

          {/* Floating "live ticket" — the hero's signature element: a real
              featured market rendered as an oversized, gently tilted glass
              card, reinforcing that the numbers on screen are live product
              data, not marketing art. */}
          <motion.div
            initial={{ opacity: 0, y: 24, rotate: -3 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative mx-auto w-full max-w-sm lg:mx-0"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="glass rounded-3xl p-6"
              style={{ boxShadow: "var(--shadow-glass), var(--shadow-glow-signal)" }}
            >
              {heroMarket && heroPricing ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-600 bg-ink-900/60 px-2.5 py-1 text-[11px] font-medium text-mist-300">
                      <span className="relative flex size-1.5">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-yes-400 opacity-75" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-yes-400" />
                      </span>
                      Live market
                    </span>
                    <ProbabilityRing yesPrice={heroPricing.yesPrice} size={56} strokeWidth={5} />
                  </div>
                  <h3 className="font-display mt-4 text-lg font-semibold leading-snug text-mist-50 line-clamp-3">
                    {heroMarket.title}
                  </h3>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-yes-500/25 bg-yes-500/10 px-3 py-2.5 text-center">
                      <div className="text-[11px] text-mist-400">Yes</div>
                      <div className="font-mono-nums text-lg font-semibold text-yes-400">
                        {heroPricing.yesPrice}¢
                      </div>
                    </div>
                    <div className="rounded-xl border border-no-500/25 bg-no-500/10 px-3 py-2.5 text-center">
                      <div className="text-[11px] text-mist-400">No</div>
                      <div className="font-mono-nums text-lg font-semibold text-no-400">
                        {heroPricing.noPrice}¢
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-mist-400">
                    <span className="font-mono-nums">{formatCompactUsd(heroMarket.totalQty)} volume</span>
                    <Link to={`/markets/${heroMarket.id}`} className="font-medium text-signal-300 hover:text-signal-200">
                      Trade now
                    </Link>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Categories                                                        */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-t border-ink-800/80 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <CategoryRail />
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Trending                                                          */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-t border-ink-800/80 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold text-mist-50">Trending markets</h2>
            <Link to="/markets" className="flex items-center gap-1 text-sm font-medium text-signal-300 hover:text-signal-200">
              See all <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
            {!isLoading && trending.length === 0 && (
              <p className="col-span-full py-10 text-center text-mist-400">
                No markets yet. Check back soon.
              </p>
            )}
            {trending.map((m, i) => (
              <MarketCard key={m.id} market={m} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Closing soon                                                      */}
      {/* ---------------------------------------------------------------- */}
      {!isLoading && closingSoon.length > 0 && (
        <section className="border-t border-ink-800/80 py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold text-mist-50">Closing soon</h2>
              <Link to="/markets" className="flex items-center gap-1 text-sm font-medium text-signal-300 hover:text-signal-200">
                See all <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {closingSoon.map((m, i) => (
                <MarketCard key={m.id} market={m} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Feature strip                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-t border-ink-800/80 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="glass glass-hover rounded-2xl p-6"
              >
                <f.icon className="size-5 text-signal-400" />
                <h3 className="font-display mt-3 text-base font-semibold text-mist-50">{f.title}</h3>
                <p className="mt-1.5 text-sm text-mist-400">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Closing CTA                                                       */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-t border-ink-800/80 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="glass relative overflow-hidden rounded-3xl px-8 py-14 text-center sm:px-16"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 60% 80% at 50% 0%, rgba(217,154,52,0.14), transparent)",
            }}
          >
            <h2 className="font-display text-3xl font-semibold text-mist-50 sm:text-4xl">
              {resolved.length > 0
                ? `${resolved.length} markets already settled. Yours is next.`
                : "Your first position is one click away."}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-mist-300">
              No sign-up friction, no synthetic pricing — just a live book and a fast fill.
            </p>
            <div className="mt-8 flex justify-center">
              <Button size="lg" asChild>
                <Link to="/markets">
                  Start trading <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
