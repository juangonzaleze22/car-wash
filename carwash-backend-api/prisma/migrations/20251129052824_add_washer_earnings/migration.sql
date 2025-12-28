-- CreateEnum
CREATE TYPE "WasherEarningStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "washer_earnings" (
    "id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "washer_id" UUID NOT NULL,
    "order_id" INTEGER NOT NULL,
    "commission_amount" DECIMAL(10,2) NOT NULL,
    "status" "WasherEarningStatus" NOT NULL DEFAULT 'PENDING',
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "washer_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "washer_earnings_order_item_id_key" ON "washer_earnings"("order_item_id");

-- CreateIndex
CREATE INDEX "washer_earnings_washer_id_idx" ON "washer_earnings"("washer_id");

-- CreateIndex
CREATE INDEX "washer_earnings_order_id_idx" ON "washer_earnings"("order_id");

-- CreateIndex
CREATE INDEX "washer_earnings_status_idx" ON "washer_earnings"("status");

-- CreateIndex
CREATE INDEX "washer_earnings_earned_at_idx" ON "washer_earnings"("earned_at");

-- AddForeignKey
ALTER TABLE "washer_earnings" ADD CONSTRAINT "washer_earnings_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "washer_earnings" ADD CONSTRAINT "washer_earnings_washer_id_fkey" FOREIGN KEY ("washer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "washer_earnings" ADD CONSTRAINT "washer_earnings_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
