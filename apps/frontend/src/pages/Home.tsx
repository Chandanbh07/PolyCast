import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
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
  { icon: Radio, title: "Live orderbooks", body: "Every market runs on a real price-time matching engine — not a synthetic curve." },
  { icon: Timer, title: "Instant settlement", body: "Trades clear the moment they match. Positions and balances update immediately." },
  { icon: Layers, title: "Split & merge", body: "Mint a full Yes/No pair from cash, or redeem a pair back to cash, any time." },
];

function Reveal({ children, delay = 0, y = 20, className }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({ title, to }: { title: string; to: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Reveal>
          <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-mist-50">{title}</h2>
        </Reveal>
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          style={{ originX: 0 }}
          className="mt-2 h-px w-16 bg-gradient-to-r from-signal-400 to-transparent"
        />
      </div>
      <Reveal delay={0.1}>
        <Link to={to} className="group flex items-center gap-1 text-sm font-medium text-signal-300 transition-colors hover:text-signal-200">
          See all <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </Reveal>
    </div>
  );
}

const gridContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const gridItem: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

export default function Home() {
  const { data: markets, isLoading } = useQuery({ queryKey: queryKeys.markets, queryFn: getMarkets });

  const open = useMemo(() => (markets ?? []).filter((m) => !m.resolution), [markets]);
  const resolved = useMemo(() => (markets ?? []).filter((m) => !!m.resolution), [markets]);

  const trending = useMemo(() => {
    const withMeta = open.map((m) => ({ market: m, meta: getMarketMeta(m) }));
    return withMeta
      .sort((a, b) => (b.meta.trending ? 1 : 0) - (a.meta.trending ? 1 : 0) || b.market.totalQty - a.market.totalQty)
      .slice(0, 3).map((w) => w.market);
  }, [open]);

  const closingSoon = useMemo(() => {
    return open.map((m) => ({ market: m, meta: getMarketMeta(m) }))
      .filter((w) => w.meta.endDate)
      .sort((a, b) => a.meta.daysLeft - b.meta.daysLeft)
      .slice(0, 3).map((w) => w.market);
  }, [open]);

  const heroMarket = trending[0] ?? open[0];
  const heroPricing = heroMarket ? getMarketPricing(heroMarket) : null;

  const totalVolume = useMemo(() => (markets ?? []).reduce((s, m) => s + m.totalQty, 0), [markets]);
  const totalParticipants = useMemo(() => open.reduce((s, m) => s + getMarketMeta(m).participants, 0), [open]);

  const tape = useMemo(() => {
    const items = open.map((m) => ({ m, p: getMarketPricing(m) })).slice(0, 10);
    return items.length ? [...items, ...items] : [];
  }, [open]);

  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <AmbientField />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 pt-20 pb-20 sm:px-6 sm:pt-28 sm:pb-28 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <motion.span
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
              className="inline-flex items-center gap-1.5 rounded-full border border-signal-500/30 bg-signal-500/10 px-3 py-1 text-xs font-medium text-signal-300"
            >
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-signal-400 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-signal-400" />
              </span>
              Prediction markets, priced in real time
            </motion.span>

            <h1 className="font-display mt-5 text-5xl font-semibold leading-[1.05] tracking-[-0.04em] text-mist-50 sm:text-6xl lg:text-[64px]">
              {"Trade what you believe will happen.".split(" ").map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 + i * 0.06, ease: "easeOut" }}
                  className="mr-[0.25em] inline-block"
                >
                  {word}
                </motion.span>
              ))}
            </h1>

            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }} className="mt-5 max-w-lg text-lg text-mist-300 leading-relaxed">
              PolyCast turns your conviction into a position. Buy Yes or No on real-world outcomes, backed by a live orderbook and settled in seconds.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/markets">Explore markets <ArrowRight className="size-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/portfolio">View portfolio</Link>
              </Button>
            </motion.div>

            <motion.div variants={gridContainer} initial="hidden" animate="show" transition={{ delayChildren: 0.7 }} className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/[0.06] pt-6">
              <motion.div variants={gridItem}>
                <div className="font-display font-mono-nums text-2xl font-semibold text-mist-50">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : <CountUp value={totalVolume} format={(n) => formatCompactUsd(n)} />}
                </div>
                <div className="mt-1 text-xs text-mist-400">Total volume</div>
              </motion.div>
              <motion.div variants={gridItem}>
                <div className="font-display font-mono-nums text-2xl font-semibold text-mist-50">
                  {isLoading ? <Skeleton className="h-8 w-12" /> : <CountUp value={open.length} />}
                </div>
                <div className="mt-1 text-xs text-mist-400">Active markets</div>
              </motion.div>
              <motion.div variants={gridItem}>
                <div className="font-display font-mono-nums text-2xl font-semibold text-mist-50">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : <CountUp value={totalParticipants} format={(n) => Math.round(n).toLocaleString()} />}
                </div>
                <div className="mt-1 text-xs text-mist-400">Traders</div>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Static, premium hero ticket — gentle entrance, no tilt/parallax/glare */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="relative mx-auto w-full max-w-sm lg:mx-0"
          >
            <div className="glass glass-hover relative rounded-3xl p-6" style={{ boxShadow: "var(--shadow-glass)" }}>
              {heroMarket && heroPricing ? (
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-mist-300">
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
                    <div
                      className="rounded-xl border border-yes-500/25 px-3 py-2.5 text-center"
                      style={{ background: "linear-gradient(160deg, rgba(34,211,238,0.14), rgba(6,182,212,0.05))" }}
                    >
                      <div className="text-[11px] text-mist-400">Yes</div>
                      <div className="font-mono-nums text-lg font-semibold text-yes-400">{heroPricing.yesPrice}¢</div>
                    </div>
                    <div
                      className="rounded-xl border border-no-500/25 px-3 py-2.5 text-center"
                      style={{ background: "linear-gradient(160deg, rgba(139,92,246,0.14), rgba(167,139,250,0.05))" }}
                    >
                      <div className="text-[11px] text-mist-400">No</div>
                      <div className="font-mono-nums text-lg font-semibold text-no-400">{heroPricing.noPrice}¢</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-mist-400">
                    <span className="font-mono-nums">{formatCompactUsd(heroMarket.totalQty)} volume</span>
                    <Link to={`/markets/${heroMarket.id}`} className="font-medium text-signal-300 hover:text-signal-200">Trade now</Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Live ticker tape */}
      {tape.length > 0 && (
        <section className="border-y border-white/[0.06] bg-white/[0.015] py-3 overflow-hidden">
          <motion.div
            className="flex w-max gap-8 whitespace-nowrap"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          >
            {tape.map(({ m, p }, i) => (
              <Link key={`${m.id}-${i}`} to={`/markets/${m.id}`} className="group flex items-center gap-2 text-sm">
                <span className="max-w-[220px] truncate text-mist-300 group-hover:text-mist-100">{m.title}</span>
                <span className="font-mono-nums text-yes-400">{p.yesPrice}¢</span>
                <span className="text-mist-500">/</span>
                <span className="font-mono-nums text-no-400">{p.noPrice}¢</span>
                <span className="mx-2 h-3 w-px bg-white/[0.1]" />
              </Link>
            ))}
          </motion.div>
        </section>
      )}

      {/* Categories */}
      <section className="border-t border-white/[0.06] py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal><CategoryRail /></Reveal>
        </div>
      </section>

      {/* Trending */}
      <section className="border-t border-white/[0.06] py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading title="Trending markets" to="/markets" />
          {isLoading ? (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-3xl" />)}
            </div>
          ) : trending.length === 0 ? (
            <p className="col-span-full py-10 text-center text-mist-400">No markets yet. Check back soon.</p>
          ) : (
            <motion.div variants={gridContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trending.map((m, i) => (
                <motion.div key={m.id} variants={gridItem} whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
                  <MarketCard market={m} index={i} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Closing soon */}
      {!isLoading && closingSoon.length > 0 && (
        <section className="border-t border-white/[0.06] py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHeading title="Closing soon" to="/markets" />
            <motion.div variants={gridContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {closingSoon.map((m, i) => (
                <motion.div key={m.id} variants={gridItem} whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
                  <MarketCard market={m} index={i} />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* Feature strip */}
      <section className="border-t border-white/[0.06] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div variants={gridContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {features.map((f) => (
              <motion.div key={f.title} variants={gridItem} whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 22 }} className="glass glass-hover group relative overflow-hidden rounded-3xl p-6">
                <div className="relative">
                  <f.icon className="size-5 text-signal-400" />
                </div>
                <h3 className="font-display relative mt-3 text-base font-semibold text-mist-50">{f.title}</h3>
                <p className="relative mt-1.5 text-sm text-mist-400 leading-relaxed">{f.body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-white/[0.06] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="glass relative overflow-hidden rounded-3xl px-8 py-14 text-center sm:px-16"
            style={{ backgroundImage: "radial-gradient(ellipse 60% 80% at 50% 0%, rgba(79,140,255,0.10), transparent)" }}
          >
            <Reveal>
              <h2 className="font-display relative text-3xl font-semibold tracking-[-0.02em] text-mist-50 sm:text-4xl">
                {resolved.length > 0 ? `${resolved.length} markets already settled. Yours is next.` : "Your first position is one click away."}
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="relative mx-auto mt-3 max-w-md text-mist-300">No sign-up friction, no synthetic pricing — just a live book and a fast fill.</p>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="relative mt-8 flex justify-center">
                <Button size="lg" asChild>
                  <Link to="/markets">Start trading <ArrowRight className="size-4" /></Link>
                </Button>
              </div>
            </Reveal>
          </motion.div>
        </div>
      </section>
    </div>
  );
}