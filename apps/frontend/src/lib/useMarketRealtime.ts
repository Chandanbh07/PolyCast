import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BACKEND_URL } from "./api";
import { queryKeys } from "./queryClient";
import type { Market, MarketStats, Trade } from "./types";

type WsMessage =
  | { type: "orderbook"; market: Market }
  | { type: "stats"; stats: MarketStats }
  | { type: "trade"; trade: Trade };

function toWsUrl(httpUrl: string, marketId: string) {
  const wsBase = httpUrl.replace(/^http/, "ws");
  return `${wsBase}/ws?marketId=${encodeURIComponent(marketId)}`;
}

/**
 * Subscribes to the backend's per-market websocket feed and pushes every
 * update straight into the react-query cache, so the orderbook, price chart,
 * recent trades feed, and stats strip all update live — for every viewer of
 * the market, not just the person who just traded.
 *
 * Falls back gracefully: if the socket can't connect (e.g. a proxy blocking
 * websockets), a short-interval refetch on the affected queries keeps things
 * "live enough" instead of the page going stale.
 */
export function useMarketRealtime(marketId: string | undefined) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!marketId) return;

    let closedByCleanup = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (!marketId) return;
      let ws: WebSocket;
      try {
        ws = new WebSocket(toWsUrl(BACKEND_URL, marketId));
      } catch {
        return;
      }
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WsMessage;
          if (msg.type === "orderbook") {
            queryClient.setQueryData(queryKeys.market(marketId), msg.market);
          } else if (msg.type === "stats") {
            queryClient.setQueryData(queryKeys.stats(marketId), msg.stats);
          } else if (msg.type === "trade") {
            queryClient.setQueryData<Trade[]>(queryKeys.trades(marketId), (prev) => {
              const next = [msg.trade, ...(prev ?? [])];
              return next.slice(0, 50);
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.chart(marketId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.positions });
            queryClient.invalidateQueries({ queryKey: queryKeys.balance });
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        if (closedByCleanup) return;
        // Auto-reconnect after a short delay (covers server restarts / blips).
        retryTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      closedByCleanup = true;
      if (retryTimer) clearTimeout(retryTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [marketId, queryClient]);
}
