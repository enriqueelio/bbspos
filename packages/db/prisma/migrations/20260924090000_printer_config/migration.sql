-- CreateTable: impresora de comandas configurable (registro único)
CREATE TABLE "PrinterConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "driver" TEXT NOT NULL DEFAULT 'windows',
    "printerName" TEXT,
    "outputPath" TEXT NOT NULL DEFAULT './tickets-output',
    "paperWidthMm" INTEGER NOT NULL DEFAULT 80,
    "updatedAt" DATETIME NOT NULL
);