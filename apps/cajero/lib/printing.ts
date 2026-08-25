import { spawn } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

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

const TICKET_FONT_PT = 10;
const TICKET_TEXT_WIDTH_PT = 204; // ancho útil de rollo térmico de 80mm

/** Envía texto plano a la impresora con letra grande y negritas, ajustada
 * para que la línea más larga quepa en el ancho del rollo térmico. */
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
    "$probeG = [System.Drawing.Graphics]::FromImage((New-Object System.Drawing.Bitmap(10, 10)))",
    "$fmt = [System.Drawing.StringFormat]::GenericTypographic",
    "$fProbe = New-Object System.Drawing.Font('Consolas', 12, [System.Drawing.FontStyle]::Bold)",
    "$cw = $probeG.MeasureString(([string]'0' * 20), $fProbe, $fmt).Width / 20",
    "$maxLen = 1",
    "foreach ($l in $lines) { if ($l.Length -gt $maxLen) { $maxLen = $l.Length } }",
    `$size = [Math]::Min(${TICKET_FONT_PT}, ${TICKET_TEXT_WIDTH_PT} / ($maxLen * $cw) * 12)`,
    "if ($size -lt 4) { $size = 4 }",
    "$font = New-Object System.Drawing.Font('Consolas', $size, [System.Drawing.FontStyle]::Bold)",
    "$doc = New-Object System.Drawing.Printing.PrintDocument",
    `$doc.PrinterSettings.PrinterName = '${safeName}'`,
    "$margins = New-Object System.Drawing.Printing.Margins(10, 10, 10, 10)",
    "$doc.DefaultPageSettings.Margins = $margins",
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

const WIDTH = 30;

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
  const money = (n: number) => `Bs ${n}`;

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
    lines.push(...wrap(`${item.quantity}x ${item.flavorName}`, WIDTH));
    for (const l of wrap(`${item.sizeName} - ${item.bobaTypeName}`, WIDTH - 3)) {
      lines.push(`   ${l}`);
    }
    for (const topping of item.toppings) {
      for (const l of wrap(topping.toppingName, WIDTH - 5)) {
        lines.push(`   + ${l}`);
      }
    }
    lines.push(row("", money(item.unitPrice * item.quantity)));
  }

  lines.push(repeat("-", WIDTH));
  lines.push(row("TOTAL:", money(order.total)));
  lines.push(repeat("=", WIDTH));
  lines.push(centered("Presente esta comanda"));
  lines.push(centered("en mostrador"));

  return `${lines.join("\n")}\n`;
}
