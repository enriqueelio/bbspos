-- AddOrderDiscountedBy
ALTER TABLE "Order" ADD COLUMN "discountedById" TEXT;
CREATE INDEX "Order_discountedById_idx" ON "Order"("discountedById");
