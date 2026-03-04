-- CreateTable
CREATE TABLE "payout_receipt_files" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_receipt_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payout_receipt_files_transactionId_idx" ON "payout_receipt_files"("transactionId");

-- AddForeignKey
ALTER TABLE "payout_receipt_files" ADD CONSTRAINT "payout_receipt_files_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
