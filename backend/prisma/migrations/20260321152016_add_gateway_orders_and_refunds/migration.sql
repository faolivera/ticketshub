-- CreateTable
CREATE TABLE "gateway_orders" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "paymentMethodId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerOrderId" TEXT NOT NULL,
    "checkoutUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gateway_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gateway_refunds" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "gatewayOrderId" TEXT NOT NULL,
    "providerOrderId" TEXT NOT NULL,
    "paymentMethodId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "apiCallLog" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gateway_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gateway_orders_transactionId_key" ON "gateway_orders"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_orders_providerOrderId_key" ON "gateway_orders"("providerOrderId");

-- CreateIndex
CREATE INDEX "gateway_orders_status_idx" ON "gateway_orders"("status");

-- CreateIndex
CREATE INDEX "gateway_orders_transactionId_status_idx" ON "gateway_orders"("transactionId", "status");

-- CreateIndex
CREATE INDEX "gateway_refunds_status_idx" ON "gateway_refunds"("status");

-- AddForeignKey
ALTER TABLE "gateway_orders" ADD CONSTRAINT "gateway_orders_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_refunds" ADD CONSTRAINT "gateway_refunds_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_refunds" ADD CONSTRAINT "gateway_refunds_gatewayOrderId_fkey" FOREIGN KEY ("gatewayOrderId") REFERENCES "gateway_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
