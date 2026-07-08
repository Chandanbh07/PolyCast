import { prisma } from "db";
import type { Orderbook } from "../types";

export type PositionSide = "Yes" | "No";

export interface BookOrder {
  userId: string;
  qty: number;
  filledQty: number;
  originalOrderId: string;
  reverseOrder: boolean;
}

export interface MarketBooks {
  yesOrderbook: Orderbook;
  noOrderbook: Orderbook;
}

export function parseOrderbook(orderbook: unknown): Orderbook {
  if (typeof orderbook === "string") {
    try {
      return JSON.parse(orderbook) as Orderbook;
    } catch {
      return {};
    }
  }

  if (orderbook && typeof orderbook === "object") {
    return orderbook as Orderbook;
  }

  return {};
}

export function sideToPosition(side: "yes" | "no"): PositionSide {
  return side === "yes" ? "Yes" : "No";
}

export function oppositeSide(side: PositionSide): PositionSide {
  return side === "Yes" ? "No" : "Yes";
}

export function bookForSide(books: MarketBooks, side: PositionSide): Orderbook {
  return side === "Yes" ? books.yesOrderbook : books.noOrderbook;
}

export function ensureLevel(book: Orderbook, price: number) {
  const key = String(price);
  if (!book[key]) {
    book[key] = { availableQty: 0, orders: [] };
  }
  return book[key]!;
}

export function addOrderToBook(
  book: Orderbook,
  price: number,
  order: BookOrder,
) {
  const level = ensureLevel(book, price);
  const remaining = order.qty - order.filledQty;
  level.availableQty += remaining;
  level.orders.push(order);
}

export function compactOrderbook(book: Orderbook): Orderbook {
  for (const [price, level] of Object.entries(book)) {
    level.orders = level.orders.filter(
      (order) => order.qty - order.filledQty > 0,
    );
    level.availableQty = level.orders.reduce(
      (sum, order) => sum + Math.max(0, order.qty - order.filledQty),
      0,
    );
    if (level.availableQty <= 0 || level.orders.length === 0) {
      delete book[price];
    }
  }

  return book;
}

export function sortedAskPrices(book: Orderbook, maxPrice: number): number[] {
  return Object.keys(book)
    .map(Number)
    .filter((price) => Number.isFinite(price) && price <= maxPrice)
    .sort((a, b) => a - b);
}

export async function computeMarketStats(marketId: string) {
  const market = await prisma.market.findFirst({ where: { id: marketId } });
  if (!market) return null;

  const yesBook = parseOrderbook(market.yesOrderbook);
  const noBook = parseOrderbook(market.noOrderbook);

  let liquidityCents = 0;
  for (const book of [yesBook, noBook]) {
    for (const [price, level] of Object.entries(book)) {
      liquidityCents += Number(price) * level.availableQty;
    }
  }

  const traderRows = await prisma.position.findMany({
    where: { marketId, qty: { gt: 0 } },
    select: { userId: true },
    distinct: ["userId"],
  });

  return {
    volume: market.totalQty,
    liquidity: liquidityCents / 100,
    traders: traderRows.length,
  };
}

export async function listOpenOrders(userId: string) {
  const markets = await prisma.market.findMany({
    select: {
      id: true,
      title: true,
      yesOrderbook: true,
      noOrderbook: true,
      resolution: true,
    },
  });

  const openOrders: {
    marketId: string;
    marketTitle: string;
    side: PositionSide;
    price: number;
    qty: number;
    originalOrderId: string;
    auto: boolean;
  }[] = [];

  for (const market of markets) {
    if (market.resolution) continue;

    const books: [Orderbook, PositionSide][] = [
      [parseOrderbook(market.yesOrderbook), "Yes"],
      [parseOrderbook(market.noOrderbook), "No"],
    ];

    for (const [book, side] of books) {
      for (const [price, level] of Object.entries(book)) {
        for (const order of level.orders) {
          if (order.userId !== userId) continue;
          const remaining = order.qty - order.filledQty;
          if (remaining <= 0) continue;
          openOrders.push({
            marketId: market.id,
            marketTitle: market.title,
            side,
            price: Number(price),
            qty: remaining,
            originalOrderId: order.originalOrderId,
            auto: order.reverseOrder,
          });
        }
      }
    }
  }

  return openOrders;
}
