-- CreateTable
CREATE TABLE "platform_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "buyer_platform_fee_percentage" DOUBLE PRECISION NOT NULL,
    "seller_platform_fee_percentage" DOUBLE PRECISION NOT NULL,
    "payment_timeout_minutes" INTEGER NOT NULL,
    "admin_review_timeout_hours" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_config_pkey" PRIMARY KEY ("id")
);
