import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const queryKeys = {
  markets: ["markets"] as const,
  market: (id: string) => ["market", id] as const,
  balance: ["balance"] as const,
  positions: ["positions"] as const,
  history: ["history"] as const,
  trades: (id: string) => ["trades", id] as const,
  stats: (id: string) => ["stats", id] as const,
  chart: (id: string) => ["chart", id] as const,
  openOrders: ["openOrders"] as const,
  comments: (id: string) => ["comments", id] as const,
  leaderboard: ["leaderboard"] as const,
};
