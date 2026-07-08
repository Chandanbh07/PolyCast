import {
  Landmark,
  Bitcoin,
  Trophy,
  Cpu,
  LineChart,
  Rocket,
  Clapperboard,
  Globe2,
  Vote,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import type { Market, MarketCategory } from "./types";

// ---------------------------------------------------------------------------
// category, endDate, and trending are now real columns on Market (see
// packages/db/prisma/schema.prisma + the 20260708120000 migration and
// prisma/seed.ts). Liquidity and participant count are still derived here:
// liquidity is cheap to compute client-side from the orderbook JSON already
// present on every Market payload (same formula the backend's /stats route
// uses), while participants and 24h change need a dedicated query
// (distinct position holders / a price-24h-ago lookup) that isn't wired into
// the list endpoint yet — that's a good follow-up slice once this data is
// live end-to-end.
// ---------------------------------------------------------------------------

export interface CategoryDef {
  key: MarketCategory;
  label: string;
  icon: LucideIcon;
  accent: string;
}

export const CATEGORIES: CategoryDef[] = [
  { key: "Politics", label: "Politics", icon: Landmark, accent: "#b98cf0" },
  { key: "Crypto", label: "Crypto", icon: Bitcoin, accent: "#f7931a" },
  { key: "Sports", label: "Sports", icon: Trophy, accent: "#34c2a4" },
  { key: "AI", label: "AI", icon: Cpu, accent: "#6ad4a8" },
  { key: "Finance", label: "Finance", icon: LineChart, accent: "#e8b263" },
  { key: "Technology", label: "Technology", icon: Rocket, accent: "#6fa8ff" },
  { key: "Entertainment", label: "Entertainment", icon: Clapperboard, accent: "#ea7c8f" },
  { key: "Economy", label: "Economy", icon: BarChart3, accent: "#d99a34" },
  { key: "Elections", label: "Elections", icon: Vote, accent: "#9c7cf0" },
  { key: "World", label: "World News", icon: Globe2, accent: "#5cc2e8" },
];

const CATEGORY_BY_KEY = new Map(CATEGORIES.map((c) => [c.key, c]));

/** Small stable string hash (djb2) — only used for the still-derived fields. */
function hash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(h >>> 0);
}

export interface MarketMeta {
  category: CategoryDef;
  endDate: Date | null;
  daysLeft: number;
  liquidity: number;
  participants: number;
  change24h: number; // percentage points, signed — derived placeholder, see header note
  trending: boolean;
  status: "Active" | "Closing soon" | "Resolved";
}

export function getMarketMeta(market: Market): MarketMeta {
  const h = hash(market.id || market.title);
  const category = CATEGORY_BY_KEY.get(market.category) ?? CATEGORIES[CATEGORIES.length - 1]!;

  const endDate = market.endDate ? new Date(market.endDate) : null;
  const daysLeft = market.resolution || !endDate ? 0 : Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86_400_000));

  const liquidity = Math.round(computeLiquidity(market));
  const participants = 40 + (h % 2400); // placeholder — see header note
  const change24h = Math.round((((h >> 7) % 1600) / 100 - 8) * 10) / 10; // placeholder — see header note

  const status: MarketMeta["status"] = market.resolution
    ? "Resolved"
    : endDate && daysLeft <= 3
      ? "Closing soon"
      : "Active";

  return { category, endDate, daysLeft, liquidity, participants, change24h, trending: market.trending, status };
}

function parseBook(raw: Market["yesOrderbook"]): Record<string, { availableQty: number }> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw as Record<string, { availableQty: number }>;
}

/** Same formula as the backend's computeMarketStats — sum(price * availableQty) across both books. */
function computeLiquidity(market: Market): number {
  let liquidityCents = 0;
  for (const raw of [market.yesOrderbook, market.noOrderbook]) {
    const book = parseBook(raw);
    for (const [price, level] of Object.entries(book)) {
      liquidityCents += Number(price) * (level.availableQty ?? 0);
    }
  }
  return liquidityCents / 100;
}

export function formatCompactUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

export function formatEndDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
