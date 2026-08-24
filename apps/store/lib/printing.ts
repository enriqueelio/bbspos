import { spawn } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

const CONFIG_PATH = join(process.cwd(), "printing.json");

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

/** Envía texto plano a la impresora indicada usando Out-Printer. */
export async function printText(
  printerName: string,
  text: string,
): Promise<void> {
  const safeName = printerName.replace(/'/g, "''");
  await runPowerShell(`$input | Out-Printer -Name '${safeName}'`, text);
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

const WIDTH = 40;

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

/** Formatea la comanda como texto plano para impresora de tickets. */
export function formatComanda(order: ComandaOrder): string {
  const lines: string[] = [];
  const money = (n: number) => `Bs ${n}`;

  lines.push(repeat("=", WIDTH));
  lines.push(centered("BUBBA DRINKS"));
  lines.push(centered(`Comanda #${String(order.seq ?? 0).padStart(5, "0")}`));
  lines.push(repeat("=", WIDTH));

  if (order.customerName) {
    lines.push(row("Cliente:", order.customerName));
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
    lines.push(
      truncate(
        `${item.quantity}x ${item.flavorName} (${item.sizeName} - ${item.bobaTypeName})`,
        WIDTH,
      ),
    );
    for (const topping of item.toppings) {
      lines.push(truncate(`   + ${topping.toppingName}`, WIDTH));
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
