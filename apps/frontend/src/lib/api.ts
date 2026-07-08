import axios from "axios";
import { supabase } from "./supabase";
import type {
  ChartPoint,
  CommentEntry,
  CreateCommentPayload,
  CreateOrderPayload,
  LeaderboardEntry,
  Market,
  MarketStats,
  OfframpPayload,
  OnrampPayload,
  OpenOrder,
  OrderHistoryEntry,
  Position,
  SplitMergePayload,
  Trade,
} from "./types";

export const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? "http://localhost:3000";

export const api = axios.create({
  baseURL: BACKEND_URL,
});

// The backend middleware (apps/backend/middleware.ts) reads `req.headers.authorization`
// and passes it directly to supabase.auth.getUser(token) — no "Bearer " prefix.
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = token;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Endpoints — these map 1:1 to apps/backend/index.ts. Nothing here is invented.
// ---------------------------------------------------------------------------

export async function getMarkets(): Promise<Market[]> {
  const res = await api.get<{ markets: Market[] }>("/markets");
  return res.data.markets;
}

export async function getMarket(marketId: string): Promise<Market | null> {
  const res = await api.get<{ market: Market | null }>("/market", {
    params: { marketId },
  });
  return res.data.market;
}

export async function placeOrder(payload: CreateOrderPayload): Promise<{ message: string }> {
  const res = await api.post("/order", payload);
  return res.data;
}

export async function splitPosition(payload: SplitMergePayload): Promise<{ message: string }> {
  const res = await api.post("/split", payload);
  return res.data;
}

export async function mergePosition(payload: SplitMergePayload): Promise<{ message: string }> {
  const res = await api.post("/merge", payload);
  return res.data;
}

export async function getBalance(): Promise<number> {
  const res = await api.get<{ balance: number }>("/balance");
  return res.data.balance;
}

export async function getPositions(): Promise<Position[]> {
  const res = await api.get<{ positions: Position[] }>("/positions");
  return res.data.positions;
}

export async function getHistory(): Promise<OrderHistoryEntry[]> {
  // Backend defines this as POST despite being a read (see apps/backend/index.ts:830)
  const res = await api.post<{ history: OrderHistoryEntry[] }>("/history");
  return res.data.history;
}

export async function onramp(payload: OnrampPayload): Promise<{ message: string; amount: number }> {
  const res = await api.post("/onramp", payload);
  return res.data;
}

export async function offramp(payload: OfframpPayload): Promise<{ message: string; amount: number }> {
  const res = await api.post("/offramp", payload);
  return res.data;
}

// ---------------------------------------------------------------------------
// Realtime / trading-terminal endpoints
// ---------------------------------------------------------------------------

export async function getTrades(marketId: string, limit = 50): Promise<Trade[]> {
  const res = await api.get<{ trades: Trade[] }>("/trades", { params: { marketId, limit } });
  return res.data.trades;
}

export async function getMarketStats(marketId: string): Promise<MarketStats> {
  const res = await api.get<{ stats: MarketStats }>("/stats", { params: { marketId } });
  return res.data.stats;
}

export async function getChart(marketId: string): Promise<ChartPoint[]> {
  const res = await api.get<{ points: ChartPoint[] }>("/chart", { params: { marketId } });
  return res.data.points;
}

export async function getOpenOrders(): Promise<OpenOrder[]> {
  const res = await api.get<{ orders: OpenOrder[] }>("/orders");
  return res.data.orders;
}

export async function getComments(marketId: string): Promise<CommentEntry[]> {
  const res = await api.get<{ comments: CommentEntry[] }>("/comments", { params: { marketId } });
  return res.data.comments;
}

export async function postComment(payload: CreateCommentPayload): Promise<{ comment: CommentEntry }> {
  const res = await api.post("/comments", payload);
  return res.data;
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const res = await api.get<{ leaderboard: LeaderboardEntry[] }>("/leaderboard");
  return res.data.leaderboard;
}
