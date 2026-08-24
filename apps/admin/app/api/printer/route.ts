import { NextRequest, NextResponse } from "next/server";
import {
  getPrinterConfig,
  listPrinters,
  setPrinterConfig,
} from "@/lib/printing";

export async function GET() {
  const [printers, config] = await Promise.all([
    listPrinters(),
    getPrinterConfig(),
  ]);

  return NextResponse.json({
    printers,
    configured: config?.printerName ?? null,
  });
}

export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    printerName?: string;
  };

  if (!body.printerName) {
    return NextResponse.json(
      { error: "Falta el nombre de la impresora." },
      { status: 400 },
    );
  }

  const printers = await listPrinters();
  const exists = printers.some((p) => p.name === body.printerName);

  if (!exists) {
    return NextResponse.json(
      { error: "La impresora ya no está instalada en el servidor." },
      { status: 400 },
    );
  }

  await setPrinterConfig(body.printerName);
  return NextResponse.json({ ok: true, configured: body.printerName });
}
