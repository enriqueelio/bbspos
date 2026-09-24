import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_PNG_OUTPUT_DIR, printVirtualPng } from "@bbspos/db";
import {
  formatTestPage,
  getPrinterConfig,
  printText,
  type PrinterSettings,
} from "@/lib/printing";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    driver?: string;
    printerName?: string;
    outputPath?: string;
    paperWidthMm?: number;
  };

  const driver =
    body.driver === "virtual-png" ? "virtual-png" : "windows";

  if (driver === "virtual-png") {
    const outputPath =
      (typeof body.outputPath === "string" && body.outputPath.trim()) ||
      DEFAULT_PNG_OUTPUT_DIR;
    const settings: PrinterSettings = {
      driver: "virtual-png",
      printerName: null,
      outputPath,
      paperWidthMm: body.paperWidthMm === 58 ? 58 : 80,
    };
    try {
      const file = await printVirtualPng(
        settings,
        formatTestPage(`Virtual PNG -> ${outputPath}`),
        { title: "prueba", number: null },
      );
      return NextResponse.json({
        ok: true,
        message: `Página de prueba generada en "${file}".`,
        file,
      });
    } catch (error) {
      return NextResponse.json({
        ok: false,
        message:
          error instanceof Error
            ? `Falló la generación del PNG: ${error.message}`
            : "Falló la generación del PNG.",
      });
    }
  }

  const printerName =
    (typeof body.printerName === "string" && body.printerName.trim()) ||
    (await getPrinterConfig())?.printerName;

  if (!printerName) {
    return NextResponse.json(
      { error: "Elige una impresora antes de probar." },
      { status: 400 },
    );
  }

  try {
    const settings: PrinterSettings = {
      driver: "windows",
      printerName,
      outputPath: DEFAULT_PNG_OUTPUT_DIR,
      paperWidthMm: 80,
    };
    await printText(settings, formatTestPage(printerName));
    return NextResponse.json({
      ok: true,
      message: `Página de prueba enviada a "${printerName}".`,
    });
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