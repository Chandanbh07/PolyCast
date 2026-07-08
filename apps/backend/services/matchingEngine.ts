import { creditBalance, debitBalance } from "./balanceService";
import {
  addOrderToBook,
  bookForSide,
  compactOrderbook,
  oppositeSide,
  sortedAskPrices,
  type MarketBooks,
  type PositionSide,
} from "./orderbookService";
import { decrementPosition, incrementPosition } from "./positionService";

type Tx = any;

export interface MatchInput {
  tx: Tx;
  marketId: string;
  userId: string;
  side: PositionSide;
  price: number;
  qty: number;
  originalOrderId: string;
}

export interface MatchResult {
  filledQty: number;
  restingQty: number;
  volumeQty: number;
}

export async function matchBuy(
  input: MatchInput,
  books: MarketBooks,
): Promise<MatchResult> {
  const { tx, marketId, userId, side, price, qty, originalOrderId } = input;
  let leftQty = qty;
  let filledQty = 0;

  await debitBalance(tx, userId, qty * price);

  const book = bookForSide(books, side);
  for (const askPrice of sortedAskPrices(book, price)) {
    const level = book[String(askPrice)];
    if (!level) continue;

    for (const order of level.orders) {
      if (leftQty <= 0) break;
      if (order.userId === userId) continue;

      const remaining = order.qty - order.filledQty;
      if (remaining <= 0) continue;

      const matchedQty = Math.min(leftQty, remaining);
      order.filledQty += matchedQty;
      leftQty -= matchedQty;
      filledQty += matchedQty;

      const priceImprovement = price - askPrice;
      if (priceImprovement > 0) {
        await creditBalance(tx, userId, priceImprovement * matchedQty);
      }

      if (!order.reverseOrder) {
        await creditBalance(tx, order.userId, askPrice * matchedQty);
      }

      await incrementPosition(tx, userId, marketId, side, matchedQty);
    }
  }

  if (leftQty > 0) {
    await incrementPosition(tx, userId, marketId, side, leftQty);
    addOrderToBook(bookForSide(books, oppositeSide(side)), 100 - price, {
      userId,
      qty: leftQty,
      filledQty: 0,
      originalOrderId,
      reverseOrder: true,
    });
  }

  compactOrderbook(books.yesOrderbook);
  compactOrderbook(books.noOrderbook);

  return {
    filledQty,
    restingQty: leftQty,
    volumeQty: filledQty,
  };
}

export async function matchSell(
  input: MatchInput,
  books: MarketBooks,
): Promise<MatchResult> {
  const { tx, marketId, userId, side, price, qty, originalOrderId } = input;
  let leftQty = qty;
  let filledQty = 0;

  await decrementPosition(tx, userId, marketId, side, qty);

  const oppositeBook = bookForSide(books, oppositeSide(side));
  const maxOppositeAsk = 100 - price;
  for (const askPrice of sortedAskPrices(oppositeBook, maxOppositeAsk)) {
    const level = oppositeBook[String(askPrice)];
    if (!level) continue;

    for (const order of level.orders) {
      if (leftQty <= 0) break;
      if (order.userId === userId) continue;

      const remaining = order.qty - order.filledQty;
      if (remaining <= 0) continue;

      const matchedQty = Math.min(leftQty, remaining);
      order.filledQty += matchedQty;
      leftQty -= matchedQty;
      filledQty += matchedQty;

      if (!order.reverseOrder) {
        await creditBalance(tx, order.userId, askPrice * matchedQty);
      }
      await creditBalance(tx, userId, (100 - askPrice) * matchedQty);
    }
  }

  if (leftQty > 0) {
    addOrderToBook(bookForSide(books, side), price, {
      userId,
      qty: leftQty,
      filledQty: 0,
      originalOrderId,
      reverseOrder: false,
    });
  }

  compactOrderbook(books.yesOrderbook);
  compactOrderbook(books.noOrderbook);

  return {
    filledQty,
    restingQty: leftQty,
    volumeQty: filledQty,
  };
}
