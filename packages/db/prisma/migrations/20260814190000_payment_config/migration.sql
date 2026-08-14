-- CreateTable
CREATE TABLE "PaymentConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "qrImage" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
