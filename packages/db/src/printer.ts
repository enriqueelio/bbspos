// Impresora térmica virtual PNG.
//
// La impresión física de las comandas usa Windows (System.Drawing vía
// PowerShell). Para probar en desarrollo o auditar tickets sin una térmica
// conectada, la configuración puede usar el driver "virtual-png": al imprimir
// se renderiza el MISMO texto del ticket, con la misma fuente Consolas y el
// mismo cálculo de tamaño que el impreso real, en un PNG de 58/80mm que se
// guarda en la carpeta configurada (default: ./tickets-output en la raíz).
import { spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import { mkdir } from "fs/promises";
import { basename, extname, isAbsolute, join, resolve } from "path";
import { prisma } from "./index";
import { localDayKey, TIME_ZONE } from "./day";

export type PrinterDriver = "windows" | "virtual-png";

export interface PrinterSettings {
  driver: PrinterDriver;
  printerName: string | null;
  outputPath: string;
  paperWidthMm: number;
}

/** Metadatos usados para nombrar el PNG de forma única y legible. */
export interface PrintJobMeta {
  /** Tipo de documento: "ticket", "cierre", "resumen", "prueba", ... */
  title?: string;
  /** Número visible del ticket (daySeq/seq) para el nombre del archivo. */
  number?: number | string | null;
  /** Fecha del documento; se usa la fecha local America/La_Paz. */
  date?: Date | string | null;
}

export const DEFAULT_PNG_OUTPUT_DIR = "./tickets-output";

const CONFIG_ID = "default";
// Config legada: printing.json dentro de apps/store. Se usa solo como respaldo
// mientras la configuración no se haya guardado en la base de datos.
const LEGACY_CONFIG_PATH = join(process.cwd(), "..", "store", "printing.json");

function rowToSettings(row: {
  driver: string;
  printerName: string | null;
  outputPath: string;
  paperWidthMm: number;
}): PrinterSettings {
  return {
    driver: row.driver === "virtual-png" ? "virtual-png" : "windows",
    printerName: row.printerName,
    outputPath: row.outputPath?.trim() || DEFAULT_PNG_OUTPUT_DIR,
    paperWidthMm: row.paperWidthMm === 58 ? 58 : 80,
  };
}

/** Lectura de la configuración activa de la impresora (BD, con respaldo JSON). */
export async function getPrinterSettings(): Promise<PrinterSettings | null> {
  const row = await prisma.printerConfig.findUnique({ where: { id: CONFIG_ID } });
  if (row) return rowToSettings(row);

  try {
    const raw = JSON.parse(readFileSync(LEGACY_CONFIG_PATH, "utf-8")) as {
      printerName?: string;
    };
    if (raw.printerName) {
      return {
        driver: "windows",
        printerName: raw.printerName,
        outputPath: DEFAULT_PNG_OUTPUT_DIR,
        paperWidthMm: 80,
      };
    }
  } catch {
    // Sin config legada: se devuelve null y la UI debe pedir configurar.
  }
  return null;
}

/** Guarda la configuración activa de la impresora en la base de datos. */
export async function savePrinterSettings(
  settings: PrinterSettings,
): Promise<PrinterSettings> {
  const row = await prisma.printerConfig.upsert({
    where: { id: CONFIG_ID },
    update: {
      driver: settings.driver,
      printerName: settings.printerName,
      outputPath: settings.outputPath,
      paperWidthMm: settings.paperWidthMm,
    },
    create: {
      id: CONFIG_ID,
      driver: settings.driver,
      printerName: settings.printerName,
      outputPath: settings.outputPath,
      paperWidthMm: settings.paperWidthMm,
    },
  });
  return rowToSettings(row);
}

function runPowerShell(script: string, input?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", script],
      { windowsHide: true },
    );

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("La impresora virtual tardó demasiado en responder."));
    }, 15_000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(
          new Error(stderr.trim() || `PowerShell salió con código ${code}.`),
        );
      }
    });

    if (input !== undefined) child.stdin.write(input);
    child.stdin.end();
  });
}

// Resolución de la carpeta de salida: el monorepo queda dos niveles arriba de
// los apps (apps/<x>); así un mismo "./tickets-output" sirve para todas las
// terminales (cajero/mesero/admin/store).
function resolveOutputDir(outputPath: string): string {
  const p = (outputPath?.trim() || DEFAULT_PNG_OUTPUT_DIR).trim();
  if (isAbsolute(p)) return p;
  return resolve(process.cwd(), "..", "..", p);
}

const SAFE = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^\w._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

function padNumber(n: number | string): string {
  return String(n).padStart(5, "0").slice(0, 8);
}

function timeKey(date?: Date): string {
  const d = date ?? new Date();
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(d)
    .replace(/:/g, "");
}

/** Clave de fecha local. Una string "YYYY-MM-DD" ya es clave local del
 *  restaurante y se usa tal cual; un Date se convierte a la zona America/La_Paz. */
function dateKey(value?: Date | string | null): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  }
  const d = typeof value === "string" ? new Date(value) : value ?? new Date();
  const valid = d instanceof Date && !Number.isNaN(d.getTime());
  return localDayKey(valid ? d : new Date());
}

/** Nombre base del archivo: ticket-00008-2026-09-24 (.png la agrega el caller). */
function baseFileName(job?: PrintJobMeta): string {
  const title = SAFE(job?.title || "ticket") || "ticket";
  const date = dateKey(job?.date);
  if (job?.number !== null && job?.number !== undefined && job.number !== "") {
    return `${title}-${padNumber(job.number)}-${date}`;
  }
  return `${title}-${date}-${timeKey()}`;
}

async function uniqueFilePath(dir: string, fileName: string): Promise<string> {
  const target = join(dir, fileName);
  if (!existsSync(target)) return target;
  const ext = extname(fileName);
  const base = basename(fileName, ext);
  for (let i = 2; i < 10_000; i++) {
    const candidate = join(dir, `${base}-${i}${ext}`);
    if (!existsSync(candidate)) return candidate;
  }
  throw new Error("No se pudo generar un nombre único para el ticket PNG.");
}

const PNG_DPI = 203; // resolución típica de una térmica de 80mm.
const MM_PER_INCH = 25.4;
// Margen interno lateral (px) en la imagen: texto justo dentro del borde.
const PNG_H_PAD_PX = 8;

function buildPngScript(params: {
  b64: string;
  widthMm: number;
  widthPx: number;
  target: string;
}): string {
  const { b64, widthMm, widthPx, target } = params;
  return [
    "Add-Type -AssemblyName System.Drawing",
    `$raw = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${b64}'))`,
    "$raw = $raw.Replace([string][char]13, '')",
    "$lines = $raw.Split([char]10)",
    `$dpi = ${PNG_DPI}`,
    `$paperPx = ${widthPx}`,
    // Lienzo ligeramente más ancho que el papel: garantiza margen a los lados
    // sin que el ajuste de fuente cambie el ancho útil del contenido.
    `$hPadPx = ${PNG_H_PAD_PX}`,
    "$widthPx = $paperPx + 2 * $hPadPx",
    "$availPx = $paperPx",
    // Sonda a la DPI final: mide la LÍNEA MÁS LARGA a 12pt y escala la fuente
    // para que quepa en el ancho útil con holgura; así el precio alineado a la
    // derecha (o cualquier línea al ancho máximo) nunca toca el borde.
    "$probeBmp = New-Object System.Drawing.Bitmap($paperPx, 10)",
    "$probeBmp.SetResolution($dpi, $dpi)",
    "$probeG = [System.Drawing.Graphics]::FromImage($probeBmp)",
    "$fmt = [System.Drawing.StringFormat]::GenericTypographic",
    "$fProbe = New-Object System.Drawing.Font('Consolas', 12, [System.Drawing.FontStyle]::Bold)",
    "$longest = ($lines | Sort-Object { $_.Length } -Descending | Select-Object -First 1)",
    "if (-not $longest) { $longest = '' }",
    "$measure = $probeG.MeasureString([string]$longest, $fProbe, 0, $fmt).Width",
    "if ($measure -le 0) { $measure = 1 }",
    "$size = [Math]::Min([single]12, [single]($availPx * 0.98 / $measure) * 12)",
    "if ($size -lt 4) { $size = 4 }",
    "$font = New-Object System.Drawing.Font('Consolas', [single]$size, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Point)",
    "$mBmp = New-Object System.Drawing.Bitmap(10, 10)",
    "$mBmp.SetResolution($dpi, $dpi)",
    "$mG = [System.Drawing.Graphics]::FromImage($mBmp)",
    "$lineH = $font.GetHeight($mG)",
    `$padPx = [int][Math]::Round(4 / 72 * $dpi)`,
    "$heightPx = [int][Math]::Ceiling($lines.Count * $lineH) + $padPx * 2",
    "$bmp = New-Object System.Drawing.Bitmap($widthPx, $heightPx)",
    "$bmp.SetResolution($dpi, $dpi)",
    "$g = [System.Drawing.Graphics]::FromImage($bmp)",
    "$g.Clear([System.Drawing.Color]::White)",
    "$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit",
    "$y = [single]$padPx",
    "foreach ($l in $lines) {",
    "  $g.DrawString($l, $font, [System.Drawing.Brushes]::Black, [single]$hPadPx, $y, $fmt)",
    "  $y += [single]$lineH",
    "}",
    `$bmp.Save('${target}', [System.Drawing.Imaging.ImageFormat]::Png)`,
    "$g.Dispose(); $mG.Dispose(); $bmp.Dispose(); $mBmp.Dispose()",
    "$probeG.Dispose(); $probeBmp.Dispose()",
    `Write-Output '${widthMm}'`,
  ].join("\n");
}

/** Renderiza el texto de un ticket como PNG y devuelve la ruta del archivo.
 *  Nunca toca impresoras físicas: es el destino "virtual" para desarrollo. */
export async function printVirtualPng(
  settings: PrinterSettings,
  text: string,
  job?: PrintJobMeta,
): Promise<string> {
  const widthMm = settings.paperWidthMm;
  const widthPx = Math.max(1, Math.round((widthMm / MM_PER_INCH) * PNG_DPI));

  const outDir = resolveOutputDir(settings.outputPath);
  await mkdir(outDir, { recursive: true });
  const target = join(outDir, `${baseFileName(job)}.png`);
  const finalPath = await uniqueFilePath(outDir, basename(target));

  const b64 = Buffer.from(text, "utf8").toString("base64");
  const script = buildPngScript({
    b64,
    widthMm,
    widthPx,
    target: finalPath.replace(/\\/g, "/"),
  });

  await runPowerShell(script);

  if (!existsSync(finalPath)) {
    throw new Error("No se pudo generar el PNG del ticket.");
  }
  return finalPath;
}