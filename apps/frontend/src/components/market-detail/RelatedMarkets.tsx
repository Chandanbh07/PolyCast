import { useQuery } from "@tanstack/react-query";
import { getMarkets } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { CATEGORIES } from "@/lib/marketMeta";
import type { Market } from "@/lib/types";
import { MarketCard } from "@/components/markets/MarketCard";
import { Skeleton } from "@/components/ui/skeleton";

export function RelatedMarkets({ market }: { market: Market }) {
  const { data: markets, isLoading } = useQuery({ queryKey: queryKeys.markets, queryFn: getMarkets });
  const categoryLabel = CATEGORIES.find((c) => c.key === market.category)?.label ?? market.category;

  const related = (markets ?? [])
    .filter((m) => m.id !== market.id && m.category === market.category && !m.resolution)
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (related.length === 0) return null;

  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-mist-50">More in {categoryLabel}</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {related.map((m, i) => (
          <MarketCard key={m.id} market={m} index={i} />
        ))}
      </div>
    </div>
  );
}
