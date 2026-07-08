import { prisma } from "db";
import type { PositionSide } from "./orderbookService";

type Tx = any;

export async function createHistory(
  tx: Tx,
  data: {
    id?: string;
    orderType: "Buy" | "Sell" | "Split" | "Merge";
    side?: PositionSide | null;
    qty: number;
    price: number;
    userId: string;
    marketId: string;
  },
) {
  return tx.orderHistory.create({
    data: {
      id: data.id,
      orderType: data.orderType,
      side: data.side ?? null,
      qty: data.qty,
      price: data.price,
      userId: data.userId,
      marketId: data.marketId,
    },
  });
}

export async function getUserHistory(userId: string) {
  return prisma.orderHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getRecentTrades(marketId: string, limit: number) {
  return prisma.orderHistory.findMany({
    where: {
      marketId,
      orderType: { in: ["Buy", "Sell"] },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      orderType: true,
      side: true,
      price: true,
      qty: true,
      createdAt: true,
      userId: true,
    },
  });
}

export async function getChartPoints(marketId: string) {
  const trades = await prisma.orderHistory.findMany({
    where: {
      marketId,
      orderType: { in: ["Buy", "Sell"] },
    },
    orderBy: { createdAt: "asc" },
    select: { price: true, side: true, createdAt: true },
  });

  return trades.map((trade) => ({
    time: trade.createdAt,
    yesPrice: trade.side === "No" ? 100 - trade.price : trade.price,
  }));
}
