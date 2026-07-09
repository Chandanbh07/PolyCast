# What changed — Production bug fixes from live testing (latest)

You ran this against a real database for the first time and hit three real
issues — here's the root cause and fix for each.

## 1. Buy/Split failing on almost every market (P2025 on `Position.update`)

**Root cause:** the matching engine's maker-fill code correctly assumes a
resting *ask* is backed by real inventory — when a taker's order matches a
resting order, it does `tx.position.update()` (decrementing the maker's
existing position), not `upsert()`. That's the right call: an ask should
never be able to conjure shares from nothing, so it's correct for this to
fail loudly if that invariant is violated. The bug was that `prisma/seed.ts`
violated the invariant — it wrote resting orders into `yesOrderbook` /
`noOrderbook` under random users without ever giving those users a matching
`Position` row. So almost any real trade that matched against seeded
liquidity hit `P2025: no record found for update`. The one market that
worked was luck — the order you placed on it happened not to cross any
resting price level.

**Fix:** `prisma/seed.ts` now tracks every resting order's maker while
building the book (`restingInventory`) and, once the market row exists,
upserts a real `Position` for each of them (qty +20% headroom, so a partial
fill doesn't leave the row at exactly zero). Verified with a scripted check
against a mocked Prisma client: 516 resting orders generated, 0 backed by
insufficient inventory.

**You need to re-seed** for this fix to take effect — it doesn't repair
already-seeded bad data: `bun run prisma/seed.ts`.

## 2. Schema drift on `OrderType`

Found while investigating #1: a migration
(`20260708130000_orderhistory_split_merge`) already added `Split`/`Merge` to
the database's `OrderType` enum, but `schema.prisma` still only declared
`Buy | Sell` — so every regenerated client silently disagreed with the
actual database. Fixed `schema.prisma` to match. No new migration needed
(the DB-side change was already applied) — **just re-run `bunx prisma
generate`** so the client's types catch up.

## 3. Toast notifications overlapping the trading sidebar

The error toast in your screenshot wasn't a separate bug — it's Sonner's
default `bottom-right` position landing directly on top of the sticky
Order Ticket / Split & Merge sidebar on Market Detail, which is exactly
what made the UI look broken/ugly on top of the real trade failure. Moved
toasts to `top-right` with a top offset clear of the navbar.

## 4. Market card layout tightened

Swapped the cramped 2×2 stat grid (volume/liquidity/holders/end-date) for a
single wrapping row with an end-aligned date, and gave the probability ring
a little more room. Not a full redesign — just removing the density that
was making cards read as cluttered.

## Deployment: "User was denied access on the database" on Render

This isn't an application bug — it's a Postgres permissions issue between
the role that ran your migrations and the role your app connects with
(`polycast`, per your logs). The most common cause: migrations were applied
by a different/admin role, and `polycast` was never explicitly granted
rights on the tables that role created — Postgres does **not** auto-grant
access to another role's objects, even within the same database.

Connect with an admin/owner connection (Render's dashboard → your Postgres
→ "Connect" gives you a superuser/owner connection string) and run:

```sql
GRANT USAGE, CREATE ON SCHEMA public TO polycast;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO polycast;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO polycast;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO polycast;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO polycast;
```

If that doesn't resolve it, double check the database name in `DATABASE_URL`
actually matches the database the migrations were applied to — a mismatched
db name produces a similarly generic "access denied" rather than a clear
"database does not exist" error on some Postgres providers.

## Markets search

Re-read `pages/Markets.tsx` end to end — it's a standard controlled input
feeding a `useMemo` filter, no bug found in the code itself. Strong
suspicion: if `/markets` was failing because of the Render permissions issue
above, the page had nothing to filter, which would look identical to "search
does nothing." Re-test once the database access is fixed and the reseed is
done — if it's still broken after that, it needs a live repro (what exactly
happens when you type: nothing renders, results don't narrow, input loses
focus, etc.) since I can't reproduce it blind.

---

# What changed — Final polish & consistency pass (latest)

A full read-through across every file touched in the previous four slices,
looking specifically for the kind of bug that only shows up when you trace
data end-to-end rather than build-check each slice in isolation. Found and
fixed:

- **Wrong address format in seed data.** This app authenticates with a
  Solana wallet (`window.solflare`, see `AuthContext.tsx`/`Navbar.tsx`), but
  `prisma/seed.ts` was generating Ethereum-style `0xDEMO...` addresses.
  Replaced with a deterministic base58 Solana-pubkey-shaped generator
  (`solanaLikeAddress()`). Also fixed `CommentsSection`'s avatar-initials
  logic, which was slicing chars `[2,4]` on the assumption of a `0x` prefix
  — now takes `[0,2]`.
- **Contrast bug from the palette swap.** The Ember palette's brand color
  (`signal-500`) went from a dark indigo to a light amber gold, but the
  default `Button` variant and the navbar logo badge still used white text
  on top of it — readable on the old dark indigo, much lower contrast on
  amber. Both now use `text-ink-950` (dark text), matching the pattern the
  `yes`/`no` button variants already used for their bright backgrounds.
- **Category label bug.** `RelatedMarkets` was rendering the raw enum value
  ("More in World") instead of the friendly label ("More in World News").
- **Terminology drift from the brief.** Market Detail's stats bar said
  "Traders" for a number the backend computes as *distinct position
  holders* — renamed to "Holders" to match the brief precisely. (The
  landing page's aggregate "Traders" stat is a different, genuinely
  platform-wide number and was left as-is.)
- Re-ran `tsc -b` + `vite build` (frontend), the esbuild syntax pass
  (backend), and the mocked-Prisma-client smoke test (seed script) as a
  final gate — all clean.

---

# What changed — Leaderboard + Portfolio overhaul (latest)

## Backend (`apps/backend`)

- **`GET /leaderboard`** (public) — ranks every user by realized profit on
  resolved markets. For each resolved market a correct share settles at
  100¢ and an incorrect one at 0¢; cost basis per user/market/side comes
  from their own `OrderHistory` rows (net of Buy minus Sell fills — the
  same records `/history` and `/chart` already use, so it can't drift out
  of sync with reality). Returns profit, volume (shares traded across *all*
  markets, not just resolved ones), win rate, and ROI per trader, sorted by
  profit descending.

## Frontend (`apps/frontend`)

- **`pages/Leaderboard.tsx`** (new) + `/leaderboard` route + nav link —
  ranked trader table with medal styling for the top 3, highlights the
  connected wallet's own row if present.
- **`lib/pnl.ts`** (new): `costBasisCents()` and `cumulativeInvestedSeries()`
  — client-side mirrors of the same cost-basis logic the backend leaderboard
  uses, so Portfolio's P&L numbers and the leaderboard's profit numbers are
  computed the same way.
- **Portfolio rebuilt**: now shows unrealized P&L (open positions, current
  price vs. cost basis) and realized P&L (resolved positions, settlement
  value vs. cost basis) as their own stat cards; positions are split into
  **Open** and **Closed** sections; `PositionCard` shows per-leg P&L; added
  a **"Net invested over time"** chart (`components/portfolio/PortfolioChart.tsx`)
  built from the user's own trade history; added a **Recent activity** feed
  reusing the same `/history` data as the Orders page.
- Fixed a bug along the way: `OrderHistoryEntry` was missing `side` and
  `createdAt`, which the backend has always returned — the frontend type
  just hadn't caught up. Needed those fields for the cost-basis/chart work.
- Renamed the "Orders" nav label to "Activity" to match the brief's IA (same
  page/route — it was already the activity feed, just under a different
  label). **Search** is intentionally not a separate page: `Markets.tsx`
  already has a working search input; a second page with the same query
  would be redundant. **Admin** was marked optional in the brief and is
  still not built.
- Verified with `tsc -b` + `vite build` (frontend); `/leaderboard` verified
  with the same esbuild syntax pass used for the rest of the backend.

---

# What changed — Market Detail redesign + Comments (latest)

The trading terminal itself (orderbook, matching engine, chart, order
ticket, split/merge) was already fully functional from earlier work — this
pass is a visual pass plus two genuinely new features: a real Comments
system and a Related Markets section.

## Database (`packages/db`)

- **Schema:** new `Comment` model (`content`, `userId`, `marketId`,
  `createdAt`), with relations added on `User` and `Market`. New migration:
  `20260708130000_add_comments`.
- **`prisma/seed.ts`**: now also clears/seeds `Comment` — 0-3 demo comments
  per market from a small realistic sample set, so the Discussion tab isn't
  empty out of the box.
- Same regeneration caveat as the last slice applies here — see that section
  above. `prisma migrate deploy && prisma generate` before running the
  backend/seed script.

## Backend (`apps/backend`)

- **`GET /comments?marketId=`** — public, returns up to 100 comments for a
  market newest-first, with the poster's wallet address joined in.
- **`POST /comments`** — wallet-authenticated (same `middleware` pattern as
  every other write route), validated with a new `CreateCommentSchema` in
  `types.ts`.

## Frontend (`apps/frontend`)

- **`pages/MarketDetail.tsx` rebuilt**: category-tinted hero with status/end
  date badges, consistent `SectionCard` wrapper (icon + title) across
  Price Chart / Order Book / Recent Trades / Resolution Criteria so the page
  reads as one coherent terminal instead of a stack of unrelated panels.
- **`components/market-detail/CommentsSection.tsx`** (new): wallet-gated
  comment composer + list, wired to the new `/comments` endpoints.
- **`components/market-detail/RelatedMarkets.tsx`** (new): same-category,
  currently-open markets, reusing the already-cached `/markets` query — no
  extra request.
- `lib/api.ts` / `lib/types.ts` / `lib/queryClient.ts`: added
  `getComments`/`postComment`, `CommentEntry`/`CreateCommentPayload` types,
  and a `comments(id)` query key.
- Verified with `tsc -b` + `vite build` (frontend) and an `esbuild` syntax
  pass (backend — full typecheck isn't possible in this sandbox since the
  backend is a Bun workspace package without a plain npm-installable
  dependency tree here; see repo README for the Bun-based dev workflow).

---

# What changed — Landing page, market cards & market metadata (latest)

This pass covers two slices: (1) a redesign of the landing page and market
cards, and (2) real `category` / `endDate` / `trending` columns on `Market`
plus a seed script, replacing what the first slice had derived client-side.

## Database (`packages/db`)

- **Schema:** `Market` gained `category` (new `MarketCategory` enum: Politics,
  Crypto, Sports, AI, Finance, Technology, Entertainment, Economy, Elections,
  World), `endDate` (nullable `DateTime`), and `trending` (`Boolean`,
  default `false`). New migration:
  `20260708120000_market_category_enddate_trending`.
- **New `prisma/seed.ts`** — seeds 46 realistic markets across all 10
  categories (plus 3 pre-resolved ones for Portfolio/Leaderboard history), 20
  demo users, resting orderbook liquidity, ~25-90 trade-history rows per
  market (deterministic random walk toward each market's seed probability),
  and a handful of open positions per market. Deterministic (seeded PRNG), so
  re-running it produces the same data — it clears
  Market/User/Position/OrderHistory first, so it's safe to re-run in a dev DB.
  Run with `bun run prisma/seed.ts` from `packages/db`.

  **Before running this on a machine with real network access:**
  ```
  bunx prisma migrate deploy   # apply the new migration
  bunx prisma generate         # regenerate the client for the new schema
  bun run prisma/seed.ts       # populate the database
  ```
  The sandbox this was authored in couldn't reach Prisma's engine-binary CDN
  (`binaries.prisma.sh`), so the generated client under
  `packages/db/generated/prisma` was **not** regenerated here — it still only
  knows about the pre-existing columns. `schema.prisma` and the migration SQL
  are correct and complete; you just need to run `prisma generate` once you
  pull this before the backend/seed script will typecheck and run against the
  new fields.

## Backend (`apps/backend`)

No code changes needed — `GET /markets` already does an unfiltered
`prisma.market.findMany()`, so the new columns come through automatically
once the client is regenerated.

## Frontend (`apps/frontend`)

- **Landing page rebuild** (`pages/Home.tsx`): ambient animated hero
  background (`components/shared/AmbientField.tsx`), a floating "live
  market" hero card showing real featured-market data, animated stat
  counters (`components/shared/CountUp.tsx`), a category rail
  (`components/markets/CategoryRail.tsx`), Trending + Closing Soon market
  rows, and a refined feature/CTA section.
- **Market cards** (`components/markets/MarketCard.tsx`): now show category,
  end date, volume, liquidity, 24h move, participants, status, and a
  trending badge, while keeping the existing probability-ring signature
  element.
- **`lib/marketMeta.ts`** (new): category/endDate/trending now read straight
  off the real `Market` fields. Liquidity is computed client-side from the
  orderbook JSON already on every market payload (same formula the backend's
  `computeMarketStats` uses). Participants and 24h price change are still
  derived placeholders — pushed to a follow-up slice, since they need a
  distinct-holder count and a price-24h-ago lookup that aren't wired into the
  list endpoint yet.
- **`pages/Markets.tsx`**: reads `?category=` from the URL (set by
  `CategoryRail` links) and filters the list accordingly, with a clearable
  category chip.
- Verified with `tsc -b` and a full `vite build` — both pass clean.

---

# What changed — Polymarket-style realtime upgrade

This pass keeps your existing matching engine, auth, and design system
untouched and focuses entirely on turning the market detail page into a real
trading terminal, plus the backend data it needs to do that live.

## Backend (`apps/backend`)

- **New `realtime.ts`** — a tiny WebSocket pub/sub (`ws` package) mounted at
  `ws://localhost:3000/ws?marketId=<id>`. Clients watching a market get pushed
  a message the instant anyone trades:
  - `{ type: "orderbook", market }` — fresh `Market` row (orderbooks + volume)
  - `{ type: "stats", stats }` — recomputed volume/liquidity/traders
  - `{ type: "trade", trade }` — the trade that just executed
- **`/order`, `/split`, `/merge`** now call `broadcast()` after their
  transaction commits, so every open tab on that market updates instantly —
  not just the trader who placed the order.
- **Bug fix:** `/split` never sent a response on the success path before
  (it would just hang until the client timed out). It now returns
  `{ message: "Split successful" }` like every other mutation, wrapped in the
  same try/catch pattern as `/order` and `/merge`.
- **New read endpoints:**
  - `GET /trades?marketId=` — last N (default 50) executed Buy/Sell orders,
    newest first → powers the "Recent trades" feed.
  - `GET /stats?marketId=` — `{ volume, liquidity, traders }`.
  - `GET /chart?marketId=` — Yes-probability-over-time series derived from
    order history (No-side trades are flipped to `100 - price` so it's always
    "probability of Yes").
  - `GET /orders` (auth required) — every resting/partially-filled order
    across all markets that belongs to the current user, derived live from
    the orderbook JSON (no new table needed — the JSON already is the source
    of truth for what's still open).

## Database (`packages/db`)

- `OrderHistory` gained two columns via a new migration
  (`20260704120000_orderhistory_side_and_time`):
  - `side` (`Yes` | `No`, nullable) — which outcome a Buy/Sell was for. Needed
    to compute a Yes-price for the chart and to color the trades feed.
  - `createdAt` (defaults to `now()`) — needed to order/plot trades over time.
    Existing rows backfill to the migration's run time.
- Run `bun install` then apply the migration the same way you did the earlier
  ones (`bunx prisma migrate deploy`, or `dev` locally) before starting the
  backend — the new columns are required by the new endpoints above.

## Frontend (`apps/frontend`)

New dependency: `recharts` (chart rendering). New file: `lib/useMarketRealtime.ts`
— opens the websocket for the market you're viewing, writes pushes straight
into the react-query cache, and auto-reconnects if the connection drops. Every
market-detail query also carries a `refetchInterval` as a safety net for
networks that block WebSockets, so the page never goes fully stale even if the
socket can't connect.

`pages/MarketDetail.tsx` was rebuilt into a two-column trading-terminal
layout instead of a single info card:

- **Live price chart** (`components/market-detail/PriceChart.tsx`) — Yes
  probability over time, recharts area chart, always ends at the live price.
- **Market stats strip** (`MarketStatsBar.tsx`) — volume / liquidity / traders.
- **Order book** — your existing YES/NO ladder component, unchanged.
- **Recent trades feed** (`RecentTrades.tsx`) — live list of executed trades.
- **Your open orders** (`OpenOrdersList.tsx`) — resting orders you still have
  in the book for this market, read-only (cancel isn't wired up — see below).
- **Trade panel** — your existing Buy/Sell/qty/total order ticket, unchanged,
  now sitting in a sticky sidebar column like Polymarket's.

## Known limitation / deliberate scope cut

Open orders are shown but **not cancelable** in this pass. Cancelling a
resting order that was auto-generated by the split/complementary-order
mechanic (the `reverseOrder` entries) would require unwinding a partial mint,
which touches the same balance/position invariants as the matching engine
itself — safer to ship as a follow-up with its own tests than to bolt on
quickly here.
