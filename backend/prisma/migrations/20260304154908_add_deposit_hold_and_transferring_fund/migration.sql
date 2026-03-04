-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionStatus" ADD VALUE 'DepositHold';
ALTER TYPE "TransactionStatus" ADD VALUE 'TransferringFund';

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "depositReleaseAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "transactions_status_depositReleaseAt_idx" ON "transactions"("status", "depositReleaseAt");
