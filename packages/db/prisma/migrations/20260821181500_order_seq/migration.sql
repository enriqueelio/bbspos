-- Add sequential order number (nullable, unique; multiple NULLs allowed)
ALTER TABLE "Order" ADD COLUMN "seq" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Order_seq_key" ON "Order"("seq");
