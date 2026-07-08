// Mirrors packages/db/prisma/schema.prisma and apps/backend/types.ts exactly.
// Do NOT add fields that don't exist on the backend models.

export type PositionType = "Yes" | "No";
export type OrderType = "Buy" | "Sell" | "Split" | "Merge";

export interface OrderbookOrder {
  userId: string;
  qty: number;
  filledQty: number;
  originalOrderId: string;
  reverseOrder: boolean;
}

export interface OrderbookLevel {
  availableQty: number;
  orders: OrderbookOrder[];
}

/** Keyed by price (integer cents, "0"-"100") */
export type Orderbook = Record<string, OrderbookLevel>;

export type MarketCategory =
  | "Politics"
  | "Crypto"
  | "Sports"
  | "AI"
  | "Finance"
  | "Technology"
  | "Entertainment"
  | "Economy"
  | "Elections"
  | "World";

export interface Market {
  id: string;
  title: string;
  description: string;
  resolutionDescription: string;
  yesOrderbook: Orderbook | string;
  noOrderbook: Orderbook | string;
  totalQty: number;
  resolution: PositionType | null;
  category: MarketCategory;
  endDate: string | null;
  trending: boolean;
}

export interface Position {
  id: string;
  userId: string;
  marketId: string;
  type: PositionType;
  qty: number;
}

export interface OrderHistoryEntry {
  id: string;
  orderType: OrderType;
  side: PositionType | null;
  qty: number;
  price: number;
  userId: string;
  marketId: string;
  createdAt: string;
}

export interface User {
  id: string;
  address: string;
  usdBalance: number;
}

// ---- Realtime / trading-terminal additions ----

export interface Trade {
  id: string;
  orderType: "Buy" | "Sell";
  side: PositionType;
  price: number;
  qty: number;
  createdAt: string;
  userId?: string;
}

export interface MarketStats {
  volume: number;
  liquidity: number;
  traders: number;
}

export interface ChartPoint {
  time: string;
  yesPrice: number;
}

export interface OpenOrder {
  marketId: string;
  marketTitle: string;
  side: PositionType;
  price: number;
  qty: number;
  originalOrderId: string;
  auto: boolean;
}

export interface LeaderboardEntry {
  userId: string;
  address: string;
  profit: number; // cents, can be negative
  volume: number; // shares, across all markets
  winRate: number; // 0-1
  roi: number; // fraction, can be negative
  resolvedPositions: number;
}

export interface CommentEntry {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  marketId: string;
  user: { address: string };
}

export interface CreateCommentPayload {
  marketId: string;
  content: string;
}

export interface CreateOrderPayload {
  marketId: string;
  side: "yes" | "no";
  type: "buy" | "sell";
  price: number;
  qty: number;
}

export interface SplitMergePayload {
  marketId: string;
  amount: number;
}

export interface OnrampPayload {
  amount: number;
}

export interface OfframpPayload {
  amount: number;
}
