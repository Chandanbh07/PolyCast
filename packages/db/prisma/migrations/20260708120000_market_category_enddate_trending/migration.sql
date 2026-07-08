-- CreateEnum
CREATE TYPE "MarketCategory" AS ENUM ('Politics', 'Crypto', 'Sports', 'AI', 'Finance', 'Technology', 'Entertainment', 'Economy', 'Elections', 'World');

-- AlterTable
ALTER TABLE "Market" ADD COLUMN     "category" "MarketCategory" NOT NULL DEFAULT 'World',
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "trending" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Market_category_idx" ON "Market"("category");

-- CreateIndex
CREATE INDEX "Market_endDate_idx" ON "Market"("endDate");
