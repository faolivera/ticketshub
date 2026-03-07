-- AlterTable
ALTER TABLE "platform_config" ADD COLUMN IF NOT EXISTS "risk_engine" JSONB;
