import { spawn } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";
import {
  type CashierDailyData,
  formatDurationMinutes,
  PaymentMethodLabel,
} from "@bbspos/types";

const CONFIG_PATH = join(process.cwd(), "..", "store", "printing.json");

export function getPrinterName(): string | null {
  try {
    const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as {
      printerName?: string;
    };
    return raw.printerName || null;
  } catch {
    return null;
  }
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
      reject(new Error("La impresora tardó demasiado en responder."));
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

const TICKET_FONT_PT = 12;

/** Envía texto plano a la impresora con letra grande y negritas, ajustada
 * para que la línea más larga quepa en el ancho del rollo térmico de 80mm. */
export async function printText(
  printerName: string,
  text: string,
): Promise<void> {
  const safeName = printerName.replace(/'/g, "''");
  const b64 = Buffer.from(text, "utf8").toString("base64");
  const script = [
    "Add-Type -AssemblyName System.Drawing",
    `$raw = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${b64}'))`,
    "$raw = $raw.Replace([string][char]13, '')",
    "$lines = $raw.Split([char]10)",
    "$maxLen = 1",
    "foreach ($l in $lines) { if ($l.Length -gt $maxLen) { $maxLen = $l.Length } }",
    "$doc = New-Object System.Drawing.Printing.PrintDocument",
    `$doc.PrinterSettings.PrinterName = '${safeName}'`,
    "$doc.DefaultPageSettings.Landscape = $false",
    "$paperW = 315; $found = $false",
    "foreach ($ps in $doc.PrinterSettings.PaperSizes) { if ($ps.Width -ge 300 -and $ps.Width -le 340) { $doc.DefaultPageSettings.PaperSize = $ps; $paperW = $ps.Width; $found = $true; break } }",
    "if (-not $found) { $doc.DefaultPageSettings.PaperSize = New-Object System.Drawing.Printing.PaperSize('Custom80mm', 315, 10000); $paperW = 315 }",
    "$margins = New-Object System.Drawing.Printing.Margins(2, 2, 2, 2)",
    "$doc.DefaultPageSettings.Margins = $margins",
    "$probeG = [System.Drawing.Graphics]::FromImage((New-Object System.Drawing.Bitmap(10, 10)))",
    "$fmt = [System.Drawing.StringFormat]::GenericTypographic",
    "$fProbe = New-Object System.Drawing.Font('Consolas', 12, [System.Drawing.FontStyle]::Bold)",
    "$cw = $probeG.MeasureString(([string]'0' * 20), $fProbe, 0, $fmt).Width / 20",
    `$availW = $paperW - 4`,
    `$size = [Math]::Min(${TICKET_FONT_PT}, $availW / ($maxLen * $cw) * 12)`,
    "if ($size -lt 4) { $size = 4 }",
    "$font = New-Object System.Drawing.Font('Consolas', $size, [System.Drawing.FontStyle]::Bold)",
    "$script:i = 0",
    "$handler = [System.Drawing.Printing.PrintPageEventHandler]{",
    "  param($sender, $e)",
    "  $y = $e.MarginBounds.Top",
    "  $h = $font.GetHeight($e.Graphics)",
    "  while ($script:i -lt $lines.Count -and ($y + $h) -le $e.MarginBounds.Bottom) {",
    "    $e.Graphics.DrawString($lines[$script:i], $font, [System.Drawing.Brushes]::Black, $e.MarginBounds.Left, $y)",
    "    $y += $h",
    "    $script:i++",
    "  }",
    "  $e.HasMorePages = ($script:i -lt $lines.Count)",
    "}",
    "$doc.add_PrintPage($handler)",
    "try { $doc.Print() } finally { $doc.remove_PrintPage($handler) }",
  ].join("\n");
  await runPowerShell(script);
}

// La térmica puede no manejar acentos ni símbolos: versión ASCII segura.
function toAscii(text: string): string {
  return text
    .replace(/·/g, "-")
    .replace(/[áà]/g, "a")
    .replace(/[éè]/g, "e")
    .replace(/[íì]/g, "i")
    .replace(/[óò]/g, "o")
    .replace(/[úù]/g, "u")
    .replace(/ñ/g, "n")
    .replace(/ü/g, "u")
    .replace(/[ÁÀ]/g, "A")
    .replace(/[ÉÈ]/g, "E")
    .replace(/[ÍÌ]/g, "I")
    .replace(/[ÓÒ]/g, "O")
    .replace(/[ÚÙ]/g, "U")
    .replace(/Ñ/g, "N")
    .replace(/Ü/g, "U");
}

interface ComandaItem {
  sizeName: string;
  flavorName: string;
  bobaTypeName: string;
  unitPrice: number;
  quantity: number;
  toppings: { toppingName: string; unitPrice: number }[];
}

interface ComandaOrder {
  seq: number | null;
  customerName: string | null;
  createdAt: Date;
  total: number;
  items: ComandaItem[];
}

// Ancho de la comanda en columnas de texto.
// Se subió de 30 a 34 para que el precio quepa en la misma línea que el ítem.
// El tamaño de letra NO cambia mientras la impresora acepte ~34 chars a 12pt;
// si en la impresora real la letra sale muy chica, bajá este número (32 o 30)
// para agrandarla (ver la fórmula `Math.Min(12, $availW/($maxLen*$cw)*12)` en printText).
const WIDTH = 34;

function repeat(ch: string, count: number): string {
  return ch.repeat(Math.max(0, count));
}

function truncate(text: string, width: number): string {
  return text.length <= width
    ? toAscii(text)
    : `${toAscii(text).slice(0, Math.max(0, width - 1))}.`;
}

function centered(text: string): string {
  const t = truncate(text, WIDTH);
  const pad = Math.max(0, Math.floor((WIDTH - t.length) / 2));
  return `${repeat(" ", pad)}${t}`;
}

function row(left: string, right: string): string {
  const l = truncate(left, WIDTH - 1);
  const r = truncate(right, WIDTH - 1);
  const space = WIDTH - l.length - r.length;
  if (space < 1) return truncate(`${l} ${r}`, WIDTH);
  return `${l}${repeat(" ", space)}${r}`;
}

// Fila con precio individual alineado a la derecha, con puntos de relleno.
function pricedRow(label: string, price: number, indent = 0): string {
  const right = money(price);
  const prefix = repeat(" ", indent);
  const l = truncate(`${prefix}${label}`, WIDTH - right.length - 1);
  const dots = WIDTH - l.length - right.length;
  const fill = dots >= 1 ? repeat(".", Math.max(1, dots)) : " ";
  return `${l}${fill}${right}`;
}

const SIZE_SHORT: Record<string, string> = { Grande: "G", Extragrande: "XG" };
const BOBA_SHORT: Record<string, string> = { Tapioca: "Tap", Explosivas: "Expl" };

// Arma la línea del ítem usando abreviaturas de tamaño y boba para
// que quepa el nombre del sabor junto al precio.
function itemLabel(flavorName: string, sizeName: string, bobaTypeName: string): string {
  const size = SIZE_SHORT[sizeName] ?? sizeName;
  const boba = BOBA_SHORT[bobaTypeName] ?? bobaTypeName;
  return `${flavorName} ${size} - ${boba}`;
}

function wrap(text: string, width: number): string[] {
  const words = toAscii(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const w = word.length > width ? `${word.slice(0, width - 1)}.` : word;
    const candidate = current ? `${current} ${w}` : w;
    if (candidate.length <= width) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

/** Formatea la comanda como texto plano para impresora de tickets. */
export function formatComanda(order: ComandaOrder): string {
  const lines: string[] = [];

  lines.push(repeat("=", WIDTH));
  lines.push(centered("BUBBLE DRINK"));
  lines.push(centered(`COMANDA #${String(order.seq ?? 0).padStart(5, "0")}`));
  lines.push(repeat("=", WIDTH));

  if (order.customerName) {
    lines.push(...wrap(`Cliente: ${order.customerName}`, WIDTH));
  }
  lines.push(
    row(
      "Fecha:",
      new Date(order.createdAt).toLocaleString("es-BO", {
        dateStyle: "short",
        timeStyle: "short",
      }),
    ),
  );
  lines.push(repeat("-", WIDTH));

  for (const item of order.items) {
    const quantityLabel = item.quantity > 1 ? `${item.quantity}x ` : "";
    const baseLabel = `${quantityLabel}${itemLabel(item.flavorName, item.sizeName, item.bobaTypeName)}`;
    lines.push(pricedRow(baseLabel, item.unitPrice * item.quantity));
    const toppingGroups = new Map<string, { count: number; total: number }>();
    for (const topping of item.toppings) {
      const g = toppingGroups.get(topping.toppingName) ?? { count: 0, total: 0 };
      g.count += 1;
      g.total += topping.unitPrice;
      toppingGroups.set(topping.toppingName, g);
    }
    for (const [name, g] of toppingGroups) {
      const label = g.count > 1 ? `${g.count}x + ${name}` : `+ ${name}`;
      lines.push(pricedRow(label, g.total, 1));
    }
  }

  lines.push(repeat("-", WIDTH));
  lines.push(pricedRow("TOTAL", order.total));
  lines.push(repeat("=", WIDTH));
  lines.push(centered("Presente esta comanda"));
  lines.push(centered("en mostrador"));

  return `${lines.join("\n")}\n`;
}

function money(n: number): string {
  return `Bs ${n}`;
}

/** Formatea el reporte del día del cajero como texto para impresora de tickets. */
export function formatReportText(
  data: CashierDailyData,
  myName: string,
): string {
  const lines: string[] = [];

  lines.push(repeat("=", WIDTH));
  lines.push(centered("BUBBLE DRINK"));
  lines.push(centered("REPORTE DEL DIA"));
  lines.push(repeat("=", WIDTH));

  lines.push(row("Fecha:", data.date));
  lines.push(row("Ingresos:", money(data.revenueTotal)));
  lines.push(row("Entregados:", String(data.deliveredOrders)));
  lines.push(row("Ticket prom.:", money(data.avgTicket)));
  lines.push(
    row(
      "Tiempo prom.:",
      data.avgDeliveryMinutes !== null
        ? formatDurationMinutes(data.avgDeliveryMinutes)
        : "-",
    ),
  );

  lines.push(repeat("-", WIDTH));
  lines.push(centered("MI RENDIMIENTO"));
  lines.push(row("Nombre:", truncate(myName, WIDTH - 8)));
  lines.push(row("Entregados:", String(data.myDeliveredOrders)));
  lines.push(
    row(
      "Tiempo prom.:",
      data.myAvgDeliveryMinutes !== null
        ? formatDurationMinutes(data.myAvgDeliveryMinutes)
        : "-",
    ),
  );

  lines.push(repeat("-", WIDTH));
  lines.push(centered("METODOS DE PAGO"));
  if (data.paymentBreakdown.length === 0) {
    lines.push("Sin pagos registrados hoy.");
  } else {
    for (const p of data.paymentBreakdown) {
      lines.push(row(PaymentMethodLabel[p.method] ?? p.method, money(p.revenue)));
      lines.push(`   (${p.orders} pedido${p.orders !== 1 ? "s" : ""})`);
    }
  }

  lines.push(repeat("=", WIDTH));

  return `${lines.join("\n")}\n`;
}
