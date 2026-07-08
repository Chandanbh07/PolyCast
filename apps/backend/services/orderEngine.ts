import { prisma } from "db";
import {
  CENTS_PER_SHARE,
  creditBalance,
  debitBalance,
  dollarsToCents,
  lockUser,
  sharesToCents,
} from "./balanceService";
import { createHistory } from "./historyService";
import { matchBuy, matchSell } from "./matchingEngine";
import { parseOrderbook, sideToPosition } from "./orderbookService";
import { decrementPosition, incrementPosition } from "./positionService";

type Tx = any;

async function lockMarket(tx: Tx, marketId: string) {
  const markets = await tx.$queryRaw<
    {
      id: string;
      yesOrderbook: unknown;
      noOrderbook: unknown;
      totalQty: number;
      resolution: "Yes" | "No" | null;
    }[]
  >`
    SELECT * FROM "Market" WHERE id=${marketId} FOR UPDATE;
  `;

  const market = markets[0];
  if (!market) {
    throw new Error("Market not found");
  }
  if (market.resolution) {
    throw new Error("Market resolved");
  }

  return market;
}

export async function executeOrder(input: {
  userId: string;
  marketId: string;
  side: "yes" | "no";
  type: "buy" | "sell";
  price: number;
  qty: number;
}) {
  const originalOrderId = crypto.randomUUID();
  const side = sideToPosition(input.side);

  const result = await prisma.$transaction(async (tx) => {
    await lockUser(tx, input.userId);
    const market = await lockMarket(tx, input.marketId);

    const books = {
      yesOrderbook: parseOrderbook(market.yesOrderbook),
      noOrderbook: parseOrderbook(market.noOrderbook),
    };

    const matchResult =
      input.type === "buy"
        ? await matchBuy(
            {
              tx,
              marketId: input.marketId,
              userId: input.userId,
              side,
              price: input.price,
              qty: input.qty,
              originalOrderId,
            },
            books,
          )
        : await matchSell(
            {
              tx,
              marketId: input.marketId,
              userId: input.userId,
              side,
              price: input.price,
              qty: input.qty,
              originalOrderId,
            },
            books,
          );

    await createHistory(tx, {
      id: originalOrderId,
      orderType: input.type === "buy" ? "Buy" : "Sell",
      side,
      price: input.price,
      qty: input.qty,
      userId: input.userId,
      marketId: input.marketId,
    });

    await tx.market.update({
      where: { id: input.marketId },
      data: {
        yesOrderbook: books.yesOrderbook,
        noOrderbook: books.noOrderbook,
        totalQty: { increment: matchResult.volumeQty },
      },
    });

    return matchResult;
  });

  return {
    ...result,
    trade: {
      id: originalOrderId,
      orderType: input.type === "buy" ? "Buy" : "Sell",
      side,
      price: input.price,
      qty: input.qty,
      createdAt: new Date().toISOString(),
    },
  };
}

export async function splitPosition(input: {
  userId: string;
  marketId: string;
  amount: number;
}) {
  await prisma.$transaction(async (tx) => {
    await lockUser(tx, input.userId);
    await lockMarket(tx, input.marketId);

    await debitBalance(tx, input.userId, sharesToCents(input.amount));
    await incrementPosition(
      tx,
      input.userId,
      input.marketId,
      "Yes",
      input.amount,
    );
    await incrementPosition(
      tx,
      input.userId,
      input.marketId,
      "No",
      input.amount,
    );
    await createHistory(tx, {
      orderType: "Split",
      side: null,
      price: 0,
      qty: input.amount,
      userId: input.userId,
      marketId: input.marketId,
    });
  });
}

export async function mergePosition(input: {
  userId: string;
  marketId: string;
  amount: number;
}) {
  await prisma.$transaction(async (tx) => {
    await lockUser(tx, input.userId);
    await lockMarket(tx, input.marketId);

    await decrementPosition(
      tx,
      input.userId,
      input.marketId,
      "Yes",
      input.amount,
    );
    await decrementPosition(
      tx,
      input.userId,
      input.marketId,
      "No",
      input.amount,
    );
    await creditBalance(tx, input.userId, sharesToCents(input.amount));
    await createHistory(tx, {
      orderType: "Merge",
      side: null,
      price: 0,
      qty: input.amount,
      userId: input.userId,
      marketId: input.marketId,
    });
  });
}

export async function onramp(input: { userId: string; amount: number }) {
  const amountCents = dollarsToCents(input.amount);
  await prisma.$transaction(async (tx) => {
    await lockUser(tx, input.userId);
    await creditBalance(tx, input.userId, amountCents);
  });
}

export async function offramp(input: { userId: string; amount: number }) {
  const amountCents = dollarsToCents(input.amount);
  await prisma.$transaction(async (tx) => {
    await lockUser(tx, input.userId);
    await debitBalance(tx, input.userId, amountCents);
  });
}

export { CENTS_PER_SHARE };
