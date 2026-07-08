import type { Market, Orderbook } from "./types";

export function parseOrderbook(raw: Orderbook | string | undefined | null): Orderbook {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Orderbook;
    } catch {
      return {};
    }
  }
  return raw;
}

/** Sorted ascending list of [priceCents, availableQty] levels with availableQty > 0 */
export function bookLevels(book: Orderbook): { price: number; qty: number }[] {
  return Object.entries(book)
    .map(([price, level]) => ({ price: Number(price), qty: level.availableQty }))
    .filter((l) => l.qty > 0)
    .sort((a, b) => a.price - b.price);
}

/**
 * yesOrderbook holds resting *ask* liquidity for Yes shares (either direct Yes sell
 * orders, or synthetic asks created from an unmatched No buy). The lowest price in
 * that book is the best (cheapest) price to buy Yes right now.
 * Same logic mirrored for No via noOrderbook.
 */
export function bestAsk(book: Orderbook): number | null {
  const levels = bookLevels(book);
  return levels.length ? levels[0].price : null;
}

export interface MarketPricing {
  yesPrice: number; // 0-100 cents, best available estimate of current Yes probability
  noPrice: number; // 0-100 cents
  yesBook: Orderbook;
  noBook: Orderbook;
  hasLiquidity: boolean;
}

/**
 * Derives a display price for Yes/No from whichever side of the book has
 * resting liquidity. If both sides are empty, falls back to an even 50/50
 * split — there is no dedicated "last price" field on the Market model, so
 * this is the most accurate representation of the real data available.
 */
export function getMarketPricing(market: Market): MarketPricing {
  const yesBook = parseOrderbook(market.yesOrderbook);
  const noBook = parseOrderbook(market.noOrderbook);

  const yesAsk = bestAsk(yesBook);
  const noAsk = bestAsk(noBook);

  let yesPrice: number;
  if (yesAsk !== null && noAsk !== null) {
    // Blend both sides: yesAsk is direct, (100 - noAsk) is the implied yes bid.
    yesPrice = Math.round((yesAsk + (100 - noAsk)) / 2);
  } else if (yesAsk !== null) {
    yesPrice = yesAsk;
  } else if (noAsk !== null) {
    yesPrice = 100 - noAsk;
  } else {
    yesPrice = 50;
  }

  yesPrice = Math.min(99, Math.max(1, yesPrice));

  return {
    yesPrice,
    noPrice: 100 - yesPrice,
    yesBook,
    noBook,
    hasLiquidity: yesAsk !== null || noAsk !== null,
  };
}
