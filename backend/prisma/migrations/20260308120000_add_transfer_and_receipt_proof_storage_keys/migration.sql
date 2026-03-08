-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "transfer_proof_storage_key" TEXT,
ADD COLUMN "transfer_proof_original_filename" TEXT,
ADD COLUMN "receipt_proof_storage_key" TEXT,
ADD COLUMN "receipt_proof_original_filename" TEXT;
