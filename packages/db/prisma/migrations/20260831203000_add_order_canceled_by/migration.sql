-- AddOrderCanceledBy
ALTER TABLE "Order" ADD COLUMN "canceledById" TEXT;
CREATE INDEX "Order_canceledById_idx" ON "Order"("canceledById");
