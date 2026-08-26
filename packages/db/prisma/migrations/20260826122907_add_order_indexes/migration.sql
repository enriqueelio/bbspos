-- DropIndex
DROP INDEX "Order_createdAt_idx";

-- CreateIndex
CREATE INDEX "Order_createdAt_status_idx" ON "Order"("createdAt", "status");

-- CreateIndex
CREATE INDEX "Order_deliveredAt_idx" ON "Order"("deliveredAt");

-- CreateIndex
CREATE INDEX "Order_userId_status_idx" ON "Order"("userId", "status");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
