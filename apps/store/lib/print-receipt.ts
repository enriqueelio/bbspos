import type { CartItem } from "@bubba/types";
import { FlavorCategoryLabel } from "@bubba/types";

export function printReceipt(
  orderId: string,
  items: CartItem[],
  total: number,
  customerName?: string | null,
  onDone?: () => void,
) {
  const lines: string[] = [];
  const w = 26;

  const center = (text: string) => {
    const pad = Math.max(0, Math.floor((w - text.length) / 2));
    return " ".repeat(pad) + text;
  };

  const line = () => "-".repeat(w);

  lines.push(center("BEBUBBA"));
  lines.push(center("Tu bubble drink"));
  lines.push(line());
  lines.push(`Pedido: #${orderId}`);
  if (customerName?.trim()) {
    lines.push(`Cliente: ${customerName.trim()}`);
  }
  lines.push(`Fecha: ${new Date().toLocaleString("es-BO")}`);
  lines.push(line());

  items.forEach((item, i) => {
    lines.push(`[${i + 1}] ${item.flavor.name}`);
    lines.push(`    Cat: ${FlavorCategoryLabel[item.category]}`);
    lines.push(`    Tam: ${item.size.name} (${item.size.oz}oz)`);
    lines.push(`    Boba: ${item.bobaType.name}`);
    if (item.toppings.length > 0) {
      lines.push(`    Extra: ${item.toppings.map((t) => t.name).join(", ")}`);
    }
    lines.push(`    Cant: ${item.quantity} x ${item.unitPrice} Bs`);
    const subtotal = item.unitPrice * item.quantity;
    lines.push(`    Subtotal: ${subtotal} Bs`);
    lines.push("");
  });

  lines.push(line());
  lines.push(center(`TOTAL: ${total} Bs`));
  lines.push(line());
  if (customerName?.trim()) {
    lines.push(center(`PARA: ${customerName.trim().toUpperCase()}`));
    lines.push("");
  }
  lines.push(center("Gracias por tu compra!"));
  lines.push("");

  const receipt = lines.join("\n");

  const printWindow = window.open("", "_blank", "width=420,height=800");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Comanda #${orderId}</title>
      <style>
        @media print {
          @page { size: 80mm auto; margin: 2mm; }
          body { margin: 0; }
        }
        body {
          font-family: "Courier New", Courier, monospace;
          font-size: 17.28px;
          white-space: pre;
          margin: 8px;
          line-height: 1.3;
        }
      </style>
    </head>
    <body>${receipt.replace(/\n/g, "<br>")}</body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  onDone?.();
  setTimeout(() => printWindow.close(), 1000);
}
