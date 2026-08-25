import { NextRequest, NextResponse } from "next/server";
import { connectSharedPrinter } from "@/lib/printing";

/** Conecta una impresora compartida por otra computadora de la red. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    uncPath?: string;
  };

  const uncPath = (body.uncPath ?? "").trim();
  // Formato UNC: \\EQUIPO\NombreImpresora
  if (!/^\\\\[^\\/:*?"<>|]+\\[^\\/:*?"<>|]+$/.test(uncPath)) {
    return NextResponse.json(
      {
        error:
          "Ruta inválida. Usa el formato \\\\EQUIPO\\Impresora (dos barras invertidas).",
      },
      { status: 400 },
    );
  }

  try {
    await connectSharedPrinter(uncPath);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `No se pudo conectar: ${error.message}. Verifica que la impresora esté compartida en el otro equipo y que haya permisos de red.`
            : "No se pudo conectar la impresora compartida.",
      },
      { status: 500 },
    );
  }
}
