-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('SELLER_DISCOUNTED_FEE', 'BUYER_DISCOUNTED_FEE');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('active', 'inactive');

-- AlterTable
ALTER TABLE "ticket_listings" ADD COLUMN     "promotionSnapshot" JSONB;

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PromotionType" NOT NULL,
    "config" JSONB NOT NULL,
    "maxUsages" INTEGER NOT NULL DEFAULT 0,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "usedInListingIds" JSONB NOT NULL,
    "status" "PromotionStatus" NOT NULL DEFAULT 'active',
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
