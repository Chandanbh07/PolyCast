/*
  Warnings:

  - Added a nullable `side` column (Yes/No) to `OrderHistory` so recent trades /
    price-chart data can tell which outcome a Buy/Sell was for.
  - Added a `createdAt` column to `OrderHistory` (defaults to now for existing
    rows) so trades can be ordered and charted over time.

*/
-- AlterTable
ALTER TABLE "OrderHistory" ADD COLUMN     "side" "PositionType";
ALTER TABLE "OrderHistory" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "OrderHistory_marketId_createdAt_idx" ON "OrderHistory"("marketId", "createdAt");
