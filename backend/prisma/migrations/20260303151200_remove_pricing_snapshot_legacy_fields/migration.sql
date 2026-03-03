-- AlterTable: remove unused pricingModel and bestOfferConfig from pricing_snapshots
ALTER TABLE "pricing_snapshots" DROP COLUMN IF EXISTS "pricingModel";
ALTER TABLE "pricing_snapshots" DROP COLUMN IF EXISTS "bestOfferConfig";
