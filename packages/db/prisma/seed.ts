// ---------------------------------------------------------------------------
// Seeds ~43 realistic markets across 10 categories, plus demo users, resting
// orderbook liquidity, trade history (OrderHistory) and a handful of open
// positions so Portfolio/Leaderboard/MarketDetail all have real data to read.
//
// IMPORTANT: run `bunx prisma generate` (or `npx prisma generate`) in this
// package *before* running this script — it was written against the schema
// in prisma/schema.prisma (which now includes Market.category / endDate /
// trending), and the generated client must be regenerated to know about
// those fields.
//
// Usage:
//   bunx prisma migrate deploy   # apply the new migration
//   bunx prisma generate         # regenerate the client for the new schema
//   bun run prisma/seed.ts       # populate the database
//
// This script is DESTRUCTIVE: it clears Market/User/Position/OrderHistory
// before reseeding, so it's safe to re-run any time in a dev/demo database.
// ---------------------------------------------------------------------------

import { prisma } from "../index";
import type { MarketCategory, PositionType, OrderType } from "../generated/prisma/enums";

// ---- deterministic PRNG (mulberry32) so re-seeding produces stable data ----
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface MarketSeed {
  title: string;
  description: string;
  resolutionDescription: string;
  category: MarketCategory;
  daysUntilEnd: number; // negative => already resolved / in the past
  pYes: number; // seed probability, 1-99
  trending?: boolean;
  resolved?: PositionType; // set to resolve the market
}

const MARKETS: MarketSeed[] = [
  // ---- Politics ----
  {
    title: "Will the US government shut down before January 2027?",
    description: "Resolves Yes if any part of the US federal government enters a funding lapse before Jan 1, 2027.",
    resolutionDescription: "Based on official OMB/Congress records of a lapse in appropriations.",
    category: "Politics", daysUntilEnd: 95, pYes: 34,
  },
  {
    title: "Will Congress pass comprehensive AI regulation in 2026?",
    description: "Resolves Yes if a federal AI regulation bill is signed into law before Dec 31, 2026.",
    resolutionDescription: "Based on congress.gov bill status and presidential signature.",
    category: "Politics", daysUntilEnd: 140, pYes: 22, trending: true,
  },
  {
    title: "Will a new US federal data privacy law pass in 2026?",
    description: "Resolves Yes if a comprehensive federal privacy statute is enacted in 2026.",
    resolutionDescription: "Based on congress.gov and public law records.",
    category: "Politics", daysUntilEnd: 160, pYes: 18,
  },
  {
    title: "Will voter turnout exceed 50% in the 2026 US midterms?",
    description: "Resolves Yes if certified turnout of eligible voters exceeds 50% nationally.",
    resolutionDescription: "Based on official state election commission turnout data.",
    category: "Politics", daysUntilEnd: 118, pYes: 41,
  },

  // ---- Elections ----
  {
    title: "Will the incumbent party retain control of the US House after 2026?",
    description: "Resolves Yes if the party currently holding a House majority keeps it after the midterms.",
    resolutionDescription: "Based on certified midterm election results.",
    category: "Elections", daysUntilEnd: 118, pYes: 46, trending: true,
  },
  {
    title: "Will the UK hold a general election before the end of 2027?",
    description: "Resolves Yes if a UK general election is held on or before Dec 31, 2027.",
    resolutionDescription: "Based on UK Parliament official records.",
    category: "Elections", daysUntilEnd: 260, pYes: 15,
  },
  {
    title: "Will a third-party candidate win over 5% in any 2026 US Senate race?",
    description: "Resolves Yes if any third-party Senate candidate certifies above 5% of the vote.",
    resolutionDescription: "Based on certified state Senate race results.",
    category: "Elections", daysUntilEnd: 118, pYes: 27,
  },
  {
    title: "Will Brazil's next presidential race go to a runoff?",
    description: "Resolves Yes if no candidate wins a first-round majority and a second round is triggered.",
    resolutionDescription: "Based on Brazil's TSE official results.",
    category: "Elections", daysUntilEnd: 210, pYes: 63,
  },

  // ---- Crypto ----
  {
    title: "Will Bitcoin close above $150,000 before January 2027?",
    description: "Resolves Yes if BTC/USD closes above $150,000 on any major exchange before Jan 1, 2027.",
    resolutionDescription: "Based on Coinbase/Binance daily close price.",
    category: "Crypto", daysUntilEnd: 175, pYes: 37, trending: true,
  },
  {
    title: "Will Ethereum flip Bitcoin in market cap before 2028?",
    description: "Resolves Yes if ETH's total market cap exceeds BTC's on any day before Jan 1, 2028.",
    resolutionDescription: "Based on CoinMarketCap end-of-day market cap data.",
    category: "Crypto", daysUntilEnd: 540, pYes: 8,
  },
  {
    title: "Will a spot XRP ETF launch in the US in 2026?",
    description: "Resolves Yes if a US-listed spot XRP ETF begins trading before Dec 31, 2026.",
    resolutionDescription: "Based on SEC filings and exchange listing notices.",
    category: "Crypto", daysUntilEnd: 130, pYes: 58,
  },
  {
    title: "Will total crypto market cap exceed $5 trillion in 2026?",
    description: "Resolves Yes if aggregate crypto market cap tops $5T at any point in 2026.",
    resolutionDescription: "Based on CoinGecko/CoinMarketCap aggregate data.",
    category: "Crypto", daysUntilEnd: 175, pYes: 29,
  },
  {
    title: "Will a top-10 exchange face a new SEC enforcement action in 2026?",
    description: "Resolves Yes if the SEC files a new enforcement action against a top-10 exchange by volume.",
    resolutionDescription: "Based on SEC.gov litigation releases.",
    category: "Crypto", daysUntilEnd: 175, pYes: 33,
  },

  // ---- AI ----
  {
    title: "Will any lab publicly claim an AGI milestone before 2027?",
    description: "Resolves Yes if a major AI lab formally claims to have reached AGI before Jan 1, 2027.",
    resolutionDescription: "Based on official lab announcements and independent verification coverage.",
    category: "AI", daysUntilEnd: 175, pYes: 6,
  },
  {
    title: "Will a major AI company IPO before the end of 2026?",
    description: "Resolves Yes if a top-10-by-valuation private AI company completes an IPO in 2026.",
    resolutionDescription: "Based on official exchange listing records.",
    category: "AI", daysUntilEnd: 150, pYes: 24, trending: true,
  },
  {
    title: "Will US AI chip export rules tighten further in 2026?",
    description: "Resolves Yes if the US adds new export restrictions on AI chips in 2026.",
    resolutionDescription: "Based on Bureau of Industry and Security rule updates.",
    category: "AI", daysUntilEnd: 130, pYes: 55,
  },
  {
    title: "Will an AI-assisted film win a major festival award by 2027?",
    description: "Resolves Yes if a film substantially using generative AI wins a top-tier festival award.",
    resolutionDescription: "Based on official festival award announcements.",
    category: "AI", daysUntilEnd: 300, pYes: 19,
  },
  {
    title: "Will global AI datacenter capex exceed $500B in 2026?",
    description: "Resolves Yes if aggregate reported AI datacenter capital expenditure exceeds $500B for 2026.",
    resolutionDescription: "Based on aggregated public company capex disclosures.",
    category: "AI", daysUntilEnd: 175, pYes: 61,
  },

  // ---- Finance ----
  {
    title: "Will the Fed cut interest rates in Q4 2026?",
    description: "Resolves Yes if the FOMC lowers the federal funds rate at any Q4 2026 meeting.",
    resolutionDescription: "Based on official FOMC statements.",
    category: "Finance", daysUntilEnd: 130, pYes: 47, trending: true,
  },
  {
    title: "Will the S&P 500 close above 7,000 before January 2027?",
    description: "Resolves Yes if the S&P 500 index closes above 7,000 on any trading day before Jan 1, 2027.",
    resolutionDescription: "Based on official S&P Dow Jones Indices closing data.",
    category: "Finance", daysUntilEnd: 175, pYes: 44,
  },
  {
    title: "Will US CPI inflation fall below 2.5% by December 2026?",
    description: "Resolves Yes if the year-over-year CPI print for any month in 2026 falls below 2.5%.",
    resolutionDescription: "Based on official Bureau of Labor Statistics CPI releases.",
    category: "Finance", daysUntilEnd: 150, pYes: 39,
  },
  {
    title: "Will a major US bank report a credit-related loss over $1B in 2026?",
    description: "Resolves Yes if any top-10 US bank discloses a single credit-related loss exceeding $1B in 2026.",
    resolutionDescription: "Based on official SEC 10-Q/10-K filings.",
    category: "Finance", daysUntilEnd: 175, pYes: 21,
  },

  // ---- Technology ----
  {
    title: "Will a foldable phone outsell flagship slabs for any major brand in 2026?",
    description: "Resolves Yes if any major manufacturer's foldable model outsells its flagship slab phone in a reported quarter.",
    resolutionDescription: "Based on manufacturer or major analyst (IDC/Counterpoint) sales data.",
    category: "Technology", daysUntilEnd: 150, pYes: 12,
  },
  {
    title: "Will a new US antitrust ruling force app store changes in 2026?",
    description: "Resolves Yes if a US court order requires a major app store to change its policies in 2026.",
    resolutionDescription: "Based on official court filings and rulings.",
    category: "Technology", daysUntilEnd: 150, pYes: 36,
  },
  {
    title: "Will quantum computing achieve a verified commercial breakthrough in 2026?",
    description: "Resolves Yes if a peer-reviewed or independently verified commercial quantum advantage result is published in 2026.",
    resolutionDescription: "Based on peer-reviewed publication and independent replication coverage.",
    category: "Technology", daysUntilEnd: 175, pYes: 17,
  },
  {
    title: "Will global smartphone shipments grow year-over-year in 2026?",
    description: "Resolves Yes if full-year 2026 global smartphone shipments exceed 2025's total.",
    resolutionDescription: "Based on IDC/Counterpoint annual shipment reports.",
    category: "Technology", daysUntilEnd: 175, pYes: 57, trending: true,
  },

  // ---- Entertainment ----
  {
    title: "Will a streaming original win Best Picture at the 2027 Oscars?",
    description: "Resolves Yes if a film produced primarily for streaming release wins Best Picture.",
    resolutionDescription: "Based on the official Academy Awards ceremony results.",
    category: "Entertainment", daysUntilEnd: 230, pYes: 23,
  },
  {
    title: "Will a music artist announce a tour grossing over $1B in 2026?",
    description: "Resolves Yes if any single tour is reported to have grossed over $1B by the end of 2026.",
    resolutionDescription: "Based on Billboard Boxscore or Pollstar aggregate reporting.",
    category: "Entertainment", daysUntilEnd: 175, pYes: 31,
  },
  {
    title: "Will a video game sell over 20 million copies in its first year in 2026?",
    description: "Resolves Yes if any single game released in 2026 sells 20M+ copies within a year of launch.",
    resolutionDescription: "Based on publisher-reported sales figures.",
    category: "Entertainment", daysUntilEnd: 175, pYes: 26,
  },
  {
    title: "Will a major studio release a film crossing $2B worldwide in 2026?",
    description: "Resolves Yes if any 2026 theatrical release crosses $2B in worldwide box office.",
    resolutionDescription: "Based on Box Office Mojo cumulative reporting.",
    category: "Entertainment", daysUntilEnd: 175, pYes: 19,
  },

  // ---- Economy ----
  {
    title: "Will US unemployment stay below 4.5% through 2026?",
    description: "Resolves Yes if every monthly US unemployment rate print in 2026 stays below 4.5%.",
    resolutionDescription: "Based on official Bureau of Labor Statistics releases.",
    category: "Economy", daysUntilEnd: 175, pYes: 52,
  },
  {
    title: "Will global GDP growth exceed 3% in 2026?",
    description: "Resolves Yes if the IMF's full-year 2026 global growth estimate exceeds 3%.",
    resolutionDescription: "Based on the IMF World Economic Outlook.",
    category: "Economy", daysUntilEnd: 200, pYes: 44,
  },
  {
    title: "Will oil prices close above $90/barrel before 2027?",
    description: "Resolves Yes if Brent crude closes above $90/barrel on any trading day before Jan 1, 2027.",
    resolutionDescription: "Based on ICE Brent futures daily close data.",
    category: "Economy", daysUntilEnd: 175, pYes: 28,
  },
  {
    title: "Will a G7 economy enter recession in 2026?",
    description: "Resolves Yes if any G7 member records two consecutive quarters of negative GDP growth in 2026.",
    resolutionDescription: "Based on official national statistics agency GDP releases.",
    category: "Economy", daysUntilEnd: 200, pYes: 25, trending: true,
  },

  // ---- Sports ----
  {
    title: "Will the reigning Super Bowl champion repeat in 2027?",
    description: "Resolves Yes if the team that wins the current Super Bowl also wins the following one.",
    resolutionDescription: "Based on official NFL results.",
    category: "Sports", daysUntilEnd: 210, pYes: 14,
  },
  {
    title: "Will a new world record be set in the men's 100m before the 2028 Olympics?",
    description: "Resolves Yes if the official men's 100m world record is broken before the 2028 Games open.",
    resolutionDescription: "Based on World Athletics ratified record data.",
    category: "Sports", daysUntilEnd: 650, pYes: 21,
  },
  {
    title: "Will an English club win the Champions League in 2027?",
    description: "Resolves Yes if a club from the English top flight wins the UEFA Champions League final in 2027.",
    resolutionDescription: "Based on the official UEFA final result.",
    category: "Sports", daysUntilEnd: 300, pYes: 33,
  },
  {
    title: "Will a Grand Slam final go to a deciding fifth set in 2026?",
    description: "Resolves Yes if any 2026 Grand Slam men's singles final reaches a fifth set.",
    resolutionDescription: "Based on official ATP/Grand Slam match records.",
    category: "Sports", daysUntilEnd: 175, pYes: 46,
  },
  {
    title: "Will the NBA Finals go to a Game 7 in 2027?",
    description: "Resolves Yes if the 2027 NBA Finals series reaches a deciding seventh game.",
    resolutionDescription: "Based on official NBA Finals results.",
    category: "Sports", daysUntilEnd: 330, pYes: 22, trending: true,
  },

  // ---- World News ----
  {
    title: "Will a ceasefire be reached in an active major conflict before 2027?",
    description: "Resolves Yes if a formally announced ceasefire covers a currently active major conflict before Jan 1, 2027.",
    resolutionDescription: "Based on UN and major wire-service reporting of a signed ceasefire.",
    category: "World", daysUntilEnd: 175, pYes: 31,
  },
  {
    title: "Will 2026 set a new global average temperature record?",
    description: "Resolves Yes if 2026 is confirmed as the warmest year on record by a major climate agency.",
    resolutionDescription: "Based on NOAA/NASA/Copernicus annual climate reports.",
    category: "World", daysUntilEnd: 200, pYes: 42,
  },
  {
    title: "Will a new country be admitted to the United Nations by 2027?",
    description: "Resolves Yes if the UN General Assembly admits a new member state before Jan 1, 2027.",
    resolutionDescription: "Based on official UN General Assembly records.",
    category: "World", daysUntilEnd: 260, pYes: 9,
  },
  {
    title: "Will international air travel volume exceed pre-pandemic levels in 2026?",
    description: "Resolves Yes if full-year 2026 global air passenger volume exceeds 2019 levels.",
    resolutionDescription: "Based on IATA annual passenger traffic data.",
    category: "World", daysUntilEnd: 175, pYes: 68,
  },

  // ---- A few already-resolved markets, for Portfolio/Leaderboard history ----
  {
    title: "Did the Fed cut rates at its June 2026 meeting?",
    description: "Resolved based on the official FOMC statement from the June 2026 meeting.",
    resolutionDescription: "Based on official FOMC statement.",
    category: "Finance", daysUntilEnd: -18, pYes: 70, resolved: "Yes",
  },
  {
    title: "Did Bitcoin close above $120,000 before July 2026?",
    description: "Resolved based on Coinbase daily close price data through June 2026.",
    resolutionDescription: "Based on Coinbase daily close price.",
    category: "Crypto", daysUntilEnd: -6, pYes: 55, resolved: "Yes",
  },
  {
    title: "Did any Grand Slam final go five sets in early 2026?",
    description: "Resolved based on official Grand Slam results from the first half of 2026.",
    resolutionDescription: "Based on official ATP/Grand Slam match records.",
    category: "Sports", daysUntilEnd: -40, pYes: 35, resolved: "No",
  },
];

const FIRST_NAMES = ["ava", "leo", "mia", "kai", "zoe", "eli", "noa", "max", "iris", "theo", "luna", "finn", "nova", "remy", "sage", "wren", "orin", "juno", "cass", "arlo"];

// This app authenticates with a Solana wallet (see AuthContext/Navbar —
// window.solflare, not MetaMask), so demo addresses need to look like
// base58 Solana pubkeys (32-44 chars, no "0x" prefix), not Ethereum ones.
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function solanaLikeAddress(seed: number): string {
  const rand = mulberry32(seed * 7919);
  let out = "";
  for (let i = 0; i < 44; i++) {
    out += BASE58_ALPHABET[Math.floor(rand() * BASE58_ALPHABET.length)];
  }
  return out;
}

const SAMPLE_COMMENTS = [
  "Orderbook's pretty thin above 70c, wouldn't chase this one at market.",
  "Liquidity's been creeping up all week — feels like smart money is picking a side.",
  "Curious how the resolution source handles a split decision here.",
  "This spread is way tighter than I expected for a market this size.",
  "Anyone else think the current price is overreacting to yesterday's news?",
  "Split into Yes/No and sold the side I didn't want — cheaper than buying outright.",
  "Volume's been steady, not much volatility the last 24h.",
  "Watching the resolution date closely, this could move fast in the final week.",
];

async function main() {
  console.log(`Seeding ${MARKETS.length} markets…`);

  // -------------------------------------------------------------- reset ---
  await prisma.comment.deleteMany();
  await prisma.orderHistory.deleteMany();
  await prisma.position.deleteMany();
  await prisma.market.deleteMany();
  await prisma.user.deleteMany();

  // -------------------------------------------------------------- users ---
  const users = await Promise.all(
    FIRST_NAMES.map((_name, i) =>
      prisma.user.create({
        data: {
          address: solanaLikeAddress(i + 1),
          usdBalance: 50_000 + Math.floor(mulberry32(i + 1)() * 4_950_000), // $500 - $50,000
        },
      })
    )
  );

  // ------------------------------------------------------------ markets ---
  for (let m = 0; m < MARKETS.length; m++) {
    const seed = MARKETS[m]!;
    const rand = mulberry32(1000 + m);

    const endDate = new Date(Date.now() + seed.daysUntilEnd * 86_400_000);
    const isResolved = !!seed.resolved;

    // ---- resting orderbook liquidity around the seed probability ----
    const yesOrderbook: Record<string, { availableQty: number; orders: unknown[] }> = {};
    const noOrderbook: Record<string, { availableQty: number; orders: unknown[] }> = {};

    if (!isResolved) {
      const noPrice = 100 - seed.pYes;
      for (let lvl = 0; lvl < 6; lvl++) {
        const yesP = Math.min(99, seed.pYes + lvl);
        const noP = Math.min(99, noPrice + lvl);
        const yesQty = Math.max(5, Math.round(400 * rand() * (1 - lvl / 8)));
        const noQty = Math.max(5, Math.round(400 * rand() * (1 - lvl / 8)));
        const yesUser = users[Math.floor(rand() * users.length)]!.id;
        const noUser = users[Math.floor(rand() * users.length)]!.id;

        yesOrderbook[String(yesP)] = {
          availableQty: yesQty,
          orders: [{ userId: yesUser, qty: yesQty, filledQty: 0, originalOrderId: crypto.randomUUID(), reverseOrder: false }],
        };
        noOrderbook[String(noP)] = {
          availableQty: noQty,
          orders: [{ userId: noUser, qty: noQty, filledQty: 0, originalOrderId: crypto.randomUUID(), reverseOrder: false }],
        };
      }
    }

    // ---- trade history: a random walk of Buy/Sell orders over the past 30 days ----
    const tradeCount = 25 + Math.floor(rand() * 65); // 25-90 trades
    const trades: {
      id: string;
      orderType: OrderType;
      side: PositionType;
      price: number;
      qty: number;
      userId: string;
      createdAt: Date;
    }[] = [];

    let walkingYesPrice = 50; // random walk starts at 50 and drifts toward pYes
    let totalQty = 0;
    for (let t = 0; t < tradeCount; t++) {
      const progress = t / tradeCount;
      const target = seed.pYes;
      walkingYesPrice = Math.round(walkingYesPrice + (target - walkingYesPrice) * 0.15 + (rand() - 0.5) * 6);
      walkingYesPrice = Math.max(1, Math.min(99, walkingYesPrice));

      const side: PositionType = rand() < 0.55 ? "Yes" : "No";
      const price = side === "Yes" ? walkingYesPrice : 100 - walkingYesPrice;
      const qty = 5 + Math.floor(rand() * 120);
      const orderType: OrderType = rand() < 0.5 ? "Buy" : "Sell";
      const daysAgo = 30 * (1 - progress);
      const createdAt = new Date(Date.now() - daysAgo * 86_400_000 - (isResolved ? -seed.daysUntilEnd * 86_400_000 : 0));

      trades.push({
        id: crypto.randomUUID(),
        orderType,
        side,
        price,
        qty,
        userId: users[Math.floor(rand() * users.length)]!.id,
        createdAt,
      });
      totalQty += qty;
    }
    // Final trade always lands on the seed probability, so the last chart point matches the card price.
    if (trades.length) {
      const last = trades[trades.length - 1]!;
      last.price = last.side === "Yes" ? seed.pYes : 100 - seed.pYes;
    }

    const market = await prisma.market.create({
      data: {
        title: seed.title,
        description: seed.description,
        resolutionDescription: seed.resolutionDescription,
        category: seed.category,
        endDate: isResolved ? null : endDate,
        trending: !!seed.trending,
        yesOrderbook,
        noOrderbook,
        totalQty,
        resolution: seed.resolved ?? null,
      },
    });

    await prisma.orderHistory.createMany({
      data: trades.map((tr) => ({ ...tr, marketId: market.id })),
    });

    // ---- a handful of open positions for Portfolio/Leaderboard demo ----
    const holderCount = 3 + Math.floor(rand() * 10);
    const holders = [...users].sort(() => rand() - 0.5).slice(0, holderCount);
    for (const holder of holders) {
      const type: PositionType = rand() < 0.5 ? "Yes" : "No";
      const qty = 5 + Math.floor(rand() * 200);
      await prisma.position.upsert({
        where: { userId_marketId_type: { userId: holder.id, marketId: market.id, type } },
        create: { userId: holder.id, marketId: market.id, type, qty },
        update: { qty: { increment: qty } },
      });
    }

    // ---- a few demo comments per market, for a populated discussion tab ----
    const commentCount = Math.floor(rand() * 4); // 0-3
    for (let c = 0; c < commentCount; c++) {
      await prisma.comment.create({
        data: {
          content: SAMPLE_COMMENTS[Math.floor(rand() * SAMPLE_COMMENTS.length)]!,
          userId: users[Math.floor(rand() * users.length)]!.id,
          marketId: market.id,
          createdAt: new Date(Date.now() - Math.floor(rand() * 20) * 3_600_000),
        },
      });
    }

    console.log(`  ✓ ${seed.title}`);
  }

  console.log(`Done. Seeded ${MARKETS.length} markets and ${users.length} users.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
