import { spawn } from "child_process";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { FlavorCategoryLabel, MenuCategoryLabel } from "@bbspos/types";

const CONFIG_PATH = join(process.cwd(), "..", "store", "printing.json");

export interface PrinterInfo {
  name: string;
  isWindowsDefault: boolean;
  workOffline: boolean;
}

export interface PrinterConfig {
  printerName: string;
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

/** Conecta una impresora compartida por otra computadora de la red,
 * ej.: \\CAJA\POS-80. Queda instalada y aparece en la lista local. */
export async function connectSharedPrinter(uncPath: string): Promise<void> {
  const safe = uncPath.trim().replace(/'/g, "''");
  await runPowerShell(
    `try { Add-Printer -ConnectionName '${safe}' -ErrorAction Stop } catch { throw $_.Exception.Message }`,
  );
}

/** Lista las impresoras instaladas en Windows de esta computadora. */
export async function listPrinters(): Promise<PrinterInfo[]> {
  const stdout = await runPowerShell(
    "ConvertTo-Json -InputObject @(Get-CimInstance Win32_Printer | Select-Object Name,Default,WorkOffline) -Compress",
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout.trim());
  } catch {
    throw new Error("No se pudo leer la lista de impresoras de esta computadora.");
  }

  const rows = Array.isArray(parsed) ? parsed : [parsed];
  return rows
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .filter((r) => typeof r.Name === "string" && r.Name.length > 0)
    .map((r) => ({
      name: r.Name as string,
      isWindowsDefault: r.Default === true,
      workOffline: r.WorkOffline === true,
    }))
    .sort(
      (a, b) =>
        Number(b.isWindowsDefault) - Number(a.isWindowsDefault) ||
        a.name.localeCompare(b.name),
    );
}

export async function getPrinterConfig(): Promise<PrinterConfig | null> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as PrinterConfig;
    return parsed.printerName ? parsed : null;
  } catch {
    return null;
  }
}

export async function setPrinterConfig(printerName: string): Promise<void> {
  await writeFile(
    CONFIG_PATH,
    JSON.stringify({ printerName }, null, 2) + "\n",
    "utf-8",
  );
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
  sizeName: string | null;
  flavorName: string | null;
  bobaTypeName: string | null;
  menuItemName: string | null;
  menuItemOptionName: string | null;
  unitPrice: number;
  quantity: number;
  toppings: { toppingName: string; unitPrice: number }[];
}

interface ComandaOrder {
  seq: number | null;
  daySeq: number | null;
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

function money(n: number): string {
  return `Bs ${n}`;
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
  lines.push(centered(`COMANDA #${String(order.daySeq ?? order.seq ?? 0).padStart(5, "0")}`));
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
    const baseLabel = item.menuItemName
      ? `${quantityLabel}${item.menuItemName}${
          item.menuItemOptionName ? ` (${item.menuItemOptionName})` : ""
        }`
      : `${quantityLabel}${itemLabel(
          item.flavorName ?? "",
          item.sizeName ?? "",
          item.bobaTypeName ?? "",
        )}`;
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

/** Página de prueba para validar la impresora elegida. */
export function formatTestPage(printerName: string): string {
  return [
    repeat("=", WIDTH),
    centered("BUBBLE DRINK"),
    centered("Prueba de impresion"),
    repeat("=", WIDTH),
    "",
    row("Impresora:", printerName),
    row("Fecha:", new Date().toLocaleString("es-BO")),
    "",
    centered("Si ve esta pagina, la"),
    centered("impresora esta lista."),
    "",
  ].join("\r\n");
}

/** Reporte RESUMEN del día para impresora térmica. */
export function formatSummaryReport(data: {
  today: { revenue: number; orders: number; avgTicket: number };
  yesterday: { revenue: number; orders: number; avgTicket: number };
  deltaPct: { revenue: number | null; orders: number | null };
  last7Days: { revenue: number; orders: number; avgTicket: number };
  pendingOrders: number;
}): string {
  const lines: string[] = [];
  lines.push(repeat("=", WIDTH));
  lines.push(centered("BUBBLE DRINK"));
  lines.push(centered("RESUMEN DEL DIA"));
  lines.push(repeat("=", WIDTH));
  lines.push("");

  lines.push(centered("HOY"));
  lines.push(row("Ingresos:", money(data.today.revenue)));
  lines.push(row("Pedidos:", String(data.today.orders)));
  lines.push(row("Ticket prom.:", money(data.today.avgTicket)));
  lines.push(
    row(
      "vs ayer:",
      data.deltaPct.revenue !== null ? `${data.deltaPct.revenue}%` : "-",
    ),
  );
  lines.push(repeat("-", WIDTH));

  lines.push(centered("AYER"));
  lines.push(row("Ingresos:", money(data.yesterday.revenue)));
  lines.push(row("Pedidos:", String(data.yesterday.orders)));
  lines.push(repeat("-", WIDTH));

  lines.push(centered("ULTIMOS 7 DIAS"));
  lines.push(row("Ingresos:", money(data.last7Days.revenue)));
  lines.push(row("Pedidos:", String(data.last7Days.orders)));
  lines.push(row("Ticket prom.:", money(data.last7Days.avgTicket)));

  lines.push(repeat("-", WIDTH));
  lines.push(row("Pendientes:", String(data.pendingOrders)));
  lines.push(repeat("=", WIDTH));
  lines.push("");

  return `${lines.join("\n")}\n`;
}

const CATEGORY_LABELS: Record<string, string> = {
  ...FlavorCategoryLabel,
  ...MenuCategoryLabel,
};

const PAYMENT_LABELS: Record<string, string> = {
  EFECTIVO: "Efectivo",
  QR: "QR",
  TARJETA: "Tarjeta",
};

/** Reporte CIERRE DIARIO para impresora térmica. */
export function formatDailyReport(data: {
  date: string;
  revenueTotal: number;
  ordersTotal: number;
  avgTicket: number;
  itemsSold: number;
  toppingsRevenue: number;
  byCategory: { category: string; orders: number; units: number; revenue: number }[];
  paymentBreakdown: { method: string; orders: number; revenue: number }[] | null;
  discountsTotal: number | null;
  cancellationsCount: number | null;
}): string {
  const lines: string[] = [];
  lines.push(repeat("=", WIDTH));
  lines.push(centered("BUBBLE DRINK"));
  lines.push(centered("CIERRE DIARIO"));
  lines.push(repeat("=", WIDTH));
  lines.push("");

  lines.push(row("Fecha:", data.date));
  lines.push(repeat("-", WIDTH));
  lines.push(row("Ingresos:", money(data.revenueTotal)));
  lines.push(row("Pedidos:", String(data.ordersTotal)));
  lines.push(row("Ticket prom.:", money(data.avgTicket)));
  lines.push(row("Artículos:", String(data.itemsSold)));
  lines.push(row("Toppings:", money(data.toppingsRevenue)));

  if (data.discountsTotal || data.cancellationsCount) {
    lines.push(repeat("-", WIDTH));
    if (data.discountsTotal) {
      lines.push(row("Descuentos:", money(data.discountsTotal)));
    }
    if (data.cancellationsCount) {
      lines.push(row("Anulaciones:", String(data.cancellationsCount)));
    }
  }

  lines.push(repeat("-", WIDTH));
  lines.push(centered("POR CATEGORIA"));
  for (const c of data.byCategory) {
    lines.push(row(CATEGORY_LABELS[c.category] ?? c.category, money(c.revenue)));
    lines.push(`   (${c.units} uni. / ${c.orders} pedidos)`);
  }

  lines.push(repeat("-", WIDTH));
  lines.push(centered("METODOS DE PAGO"));
  if (!data.paymentBreakdown || data.paymentBreakdown.length === 0) {
    lines.push("Sin pagos registrados.");
  } else {
    for (const p of data.paymentBreakdown) {
      lines.push(row(PAYMENT_LABELS[p.method] ?? p.method, money(p.revenue)));
      lines.push(`   (${p.orders} pedido${p.orders !== 1 ? "s" : ""})`);
    }
  }

  lines.push(repeat("=", WIDTH));
  lines.push("");

  return `${lines.join("\n")}\n`;
}
