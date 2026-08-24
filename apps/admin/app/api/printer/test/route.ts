import { NextRequest, NextResponse } from "next/server";
import {
  formatTestPage,
  getPrinterConfig,
  printText,
} from "@/lib/printing";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    printerName?: string;
  };

  const printerName = body.printerName || (await getPrinterConfig())?.printerName;

  if (!printerName) {
    return NextResponse.json(
      { error: "Elige una impresora antes de probar." },
      { status: 400 },
    );
  }

  try {
    await printText(printerName, formatTestPage(printerName));
    return NextResponse.json({ ok: true, message: `Página de prueba enviada a "${printerName}".` });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message:
        error instanceof Error
          ? `Falló la impresión en "${printerName}". Verifica que esté encendida y en línea.`
          : "Falló la impresión de prueba.",
    });
  }
}
