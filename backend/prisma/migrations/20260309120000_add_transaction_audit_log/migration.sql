-- CreateTable
CREATE TABLE "transaction_audit_logs" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "transaction_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transaction_audit_logs_transaction_id_idx" ON "transaction_audit_logs"("transaction_id");

-- CreateIndex
CREATE INDEX "transaction_audit_logs_transaction_id_changed_at_idx" ON "transaction_audit_logs"("transaction_id", "changed_at" DESC);

-- AddForeignKey
ALTER TABLE "transaction_audit_logs" ADD CONSTRAINT "transaction_audit_logs_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
