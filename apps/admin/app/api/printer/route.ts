import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_PNG_OUTPUT_DIR,
  type PrinterSettings,
} from "@bbspos/db";
import {
  getPrinterConfig,
  listPrinters,
  setPrinterConfig,
  type PrinterInfo,
} from "@/lib/printing";

const DRIVERS = ["windows", "virtual-png"] as const;

function normalizeOutputPath(value: unknown): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || DEFAULT_PNG_OUTPUT_DIR;
}

export async function GET() {
  const [printers, config] = await Promise.all([
    listPrinters(),
    getPrinterConfig(),
  ]);

  return NextResponse.json({
    printers,
    config,
    configured: config?.printerName ?? null,
  });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    driver?: string;
    printerName?: string;
    outputPath?: string;
    paperWidthMm?: number;
  };

  const driver = DRIVERS.includes(body.driver as (typeof DRIVERS)[number])
    ? (body.driver as PrinterSettings["driver"])
    : "windows";

  if (driver === "windows") {
    if (!body.printerName) {
      return NextResponse.json(
        { error: "Falta el nombre de la impresora de Windows." },
        { status: 400 },
      );
    }
    const printerName = body.printerName.trim();
    const printers: PrinterInfo[] = await listPrinters();
    const exists = printers.some((p) => p.name === printerName);
    if (!exists) {
      return NextResponse.json(
        { error: "La impresora ya no está instalada en esta computadora." },
        { status: 400 },
      );
    }
    const saved = await setPrinterConfig({
      driver: "windows",
      printerName,
      outputPath: normalizeOutputPath(body.outputPath),
      paperWidthMm: body.paperWidthMm === 58 ? 58 : 80,
    });
    return NextResponse.json({ ok: true, config: saved });
  }

  const saved = await setPrinterConfig({
    driver: "virtual-png",
    printerName: null,
    outputPath: normalizeOutputPath(body.outputPath),
    paperWidthMm: body.paperWidthMm === 58 ? 58 : 80,
  });
  return NextResponse.json({ ok: true, config: saved });
}