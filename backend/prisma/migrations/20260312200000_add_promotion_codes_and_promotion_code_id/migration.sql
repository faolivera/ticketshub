-- CreateEnum
CREATE TYPE "PromotionConfigTarget" AS ENUM ('seller', 'verified_seller', 'buyer', 'verified_buyer');

-- AlterTable
ALTER TABLE "promotions" ADD COLUMN "promotionCodeId" TEXT;

-- CreateTable
CREATE TABLE "promotion_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "promotionConfig" JSONB NOT NULL,
    "target" "PromotionConfigTarget" NOT NULL,
    "maxUsages" INTEGER NOT NULL DEFAULT 0,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "promotion_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promotion_codes_code_key" ON "promotion_codes"("code");
