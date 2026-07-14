import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { getMarkets } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { getMarketPricing } from "@/lib/orderbook";
import { CATEGORIES } from "@/lib/marketMeta";
import type { MarketCategory } from "@/lib/types";
import { MarketCard } from "@/components/markets/MarketCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SortKey = "volume" | "yes-high" | "yes-low";

const gridContainer = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const gridItem = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } };

export default function Markets() {
  const { data: markets, isLoading } = useQuery({ queryKey: queryKeys.markets, queryFn: getMarkets });
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category") as MarketCategory | null;
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("volume");
  const [status, setStatus] = useState<"open" | "resolved">("open");

  const categoryDef = category ? CATEGORIES.find((c) => c.key === category) : null;

  const filtered = useMemo(() => {
    let list = (markets ?? []).filter((m) => (status === "open" ? !m.resolution : !!m.resolution));
    if (category) {
      list = list.filter((m) => m.category === category);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((m) => m.title.toLowerCase().includes(q) || m.description.toLowerCase().includes(q));
    }
    const withPricing = list.map((m) => ({ market: m, pricing: getMarketPricing(m) }));
    withPricing.sort((a, b) => {
      if (sort === "volume") return b.market.totalQty - a.market.totalQty;
      if (sort === "yes-high") return b.pricing.yesPrice - a.pricing.yesPrice;
      return a.pricing.yesPrice - b.pricing.yesPrice;
    });
    return withPricing.map((w) => w.market);
  }, [markets, query, sort, status, category]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-mist-50">Markets</h1>
          <p className="mt-1 text-sm text-mist-400">
            <span className="font-mono-nums">{filtered.length}</span> markets
          </p>
        </div>
        <div className="group relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mist-400 transition-colors group-focus-within:text-signal-400" />
          <Input
            placeholder="Search markets…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="mt-5 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={status} onValueChange={(v) => setStatus(v as "open" | "resolved")}>
            <TabsList>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>
          </Tabs>

          {categoryDef && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}>
              <Badge variant="signal" className="gap-1.5 py-1">
                <categoryDef.icon className="size-3" />
                {categoryDef.label}
                <button
                  type="button"
                  onClick={() => setSearchParams((p) => (p.delete("category"), p))}
                  className="ml-0.5 rounded-full hover:text-mist-50"
                  aria-label="Clear category filter"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            </motion.div>
          )}
        </div>

        <Tabs value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <TabsList>
            <TabsTrigger value="volume">Volume</TabsTrigger>
            <TabsTrigger value="yes-high">Yes ↓</TabsTrigger>
            <TabsTrigger value="yes-low">Yes ↑</TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {isLoading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-3xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="col-span-full py-16 text-center text-mist-400">No {status} markets match your search.</p>
      ) : (
        <motion.div
          key={`${status}-${category}-${sort}-${query}`}
          variants={gridContainer}
          initial="hidden"
          animate="show"
          className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((m, i) => (
            <motion.div key={m.id} variants={gridItem}>
              <MarketCard market={m} index={i} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}