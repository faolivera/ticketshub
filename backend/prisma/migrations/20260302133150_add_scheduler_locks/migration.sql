-- CreateTable
CREATE TABLE "scheduler_locks" (
    "id" TEXT NOT NULL,
    "locked_by" TEXT NOT NULL,
    "locked_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduler_locks_pkey" PRIMARY KEY ("id")
);
