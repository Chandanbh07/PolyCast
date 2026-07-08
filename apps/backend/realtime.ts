import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { URL } from "url";

/**
 * Tiny pub/sub layer on top of `ws` so the frontend can subscribe to a single
 * market (`/ws?marketId=...`) and receive a push the instant that market's
 * orderbook, stats, or trade feed changes — instead of having to poll.
 *
 * This intentionally does not touch Prisma / matching-engine logic at all;
 * `broadcast()` is called *after* a transaction has already committed.
 */

type Room = Set<WebSocket>;
const rooms = new Map<string, Room>();

export function attachRealtime(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url ?? "", "http://localhost");
    const marketId = url.searchParams.get("marketId");

    if (!marketId) {
      ws.close(1008, "marketId query param is required");
      return;
    }

    let room = rooms.get(marketId);
    if (!room) {
      room = new Set();
      rooms.set(marketId, room);
    }
    room.add(ws);

    ws.on("close", () => {
      room?.delete(ws);
      if (room && room.size === 0) {
        rooms.delete(marketId);
      }
    });

    ws.on("error", () => {
      room?.delete(ws);
    });
  });

  return wss;
}

export function broadcast(marketId: string, payload: unknown) {
  const room = rooms.get(marketId);
  if (!room || room.size === 0) return;

  const message = JSON.stringify(payload);
  for (const client of room) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}
