import { jsPDF } from "jspdf";
import {
  FlavorCategoryLabel,
  PaymentMethodLabel,
  type AdjustmentsData,
  type CategorySalesData,
  type DailyReportData,
  type DashboardSummaryData,
  type DayTotalData,
  type PeakHoursData,
  type PaymentsData,
  type SalesRangeData,
  type SlowMoverRow,
  type StaffPerformanceRow,
  type TopProductRow,
} from "@bbspos/types";
import type { ReportKey } from "./excel";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_X = 14;
const MARGIN_TOP = 16;
const MARGIN_BOTTOM = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const INK: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [90, 98, 112];
const LINE: [number, number, number] = [176, 182, 192];
const HEADER_FILL: [number, number, number] = [238, 240, 243];

const BODY_FONT_SIZE = 9;
const BODY_LINE_HEIGHT = 4.2;
const CELL_PADDING_X = 2;
const CELL_PADDING_Y = 1.6;

const REPORT_TITLES: Record<ReportKey, string> = {
  dashboard: "Resumen general",
  daily: "Cierre diario",
  "day-total": "Ventas totales",
  "sales-range": "Evolución de ventas",
  "peak-hours": "Horas pico",
  "category-sales": "Ventas por categoría",
  "top-products": "Productos más vendidos",
  "slow-movers": "Productos de baja rotación",
  "staff-performance": "Rendimiento del personal",
  adjustments: "Anulaciones y descuentos",
  payments: "Métodos de pago",
};

type Align = "left" | "right" | "center";

interface Column {
  header: string;
  weight: number;
  align?: Align;
}

type Cell = string;

type Block =
  | { kind: "table"; caption?: string; columns: Column[]; rows: Cell[][] }
  | { kind: "empty"; caption?: string; text: string };

function money(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  return `${n.toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} Bs`;
}

function integer(value: number): string {
  return (Number.isFinite(value) ? value : 0).toLocaleString("es-BO");
}

function percent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return `${value}%`;
}

function paddedTicket(value: number | null | undefined): string {
  return `#${String(value ?? 0).padStart(5, "0")}`;
}

function formatShortDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-BO", {
    timeZone: "America/La_Paz",
    dateStyle: "short",
    timeStyle: "short",
  });
}

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

class PdfReport {
  private readonly doc: jsPDF;
  private y: number;
  private readonly title: string;

  constructor(title: string, subtitle: string[]) {
    this.doc = new jsPDF("p", "mm", "a4");
    this.title = title;
    this.y = MARGIN_TOP;

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(16);
    this.doc.setTextColor(...INK);
    this.doc.text(title, MARGIN_X, this.y);
    this.y += 7;

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(9);
    this.doc.setTextColor(...MUTED);
    for (const line of subtitle) {
      this.doc.text(line, MARGIN_X, this.y);
      this.y += 4.4;
    }

    this.y += 1;
    this.rule();
    this.y += 7;
  }

  private rule(): void {
    this.doc.setDrawColor(...LINE);
    this.doc.setLineWidth(0.3);
    this.doc.line(MARGIN_X, this.y, PAGE_WIDTH - MARGIN_X, this.y);
  }

  private caption(text: string): void {
    if (this.y + 16 > PAGE_HEIGHT - MARGIN_BOTTOM) {
      this.newPage();
    }
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(10.5);
    this.doc.setTextColor(...INK);
    this.doc.text(text.toUpperCase(), MARGIN_X, this.y);
    this.y += 4.5;
  }

  private newPage(): void {
    this.doc.addPage();
    this.y = MARGIN_TOP;
  }

  private columnWidths(columns: Column[]): number[] {
    const total = columns.reduce((acc, c) => acc + Math.max(c.weight, 0.01), 0);
    return columns.map((c) => (Math.max(c.weight, 0.01) / total) * CONTENT_WIDTH);
  }

  private drawHeaderRow(
    columns: Column[],
    widths: number[],
    height: number,
  ): void {
    if (this.y + height > PAGE_HEIGHT - MARGIN_BOTTOM) {
      this.newPage();
    }
    const y0 = this.y;
    this.doc.setFillColor(...HEADER_FILL);
    this.doc.setDrawColor(...LINE);
    this.doc.setLineWidth(0.2);
    this.doc.rect(MARGIN_X, y0, CONTENT_WIDTH, height, "FD");

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(BODY_FONT_SIZE);
    this.doc.setTextColor(...INK);

    let x = MARGIN_X;
    columns.forEach((column, index) => {
      const align = column.align ?? "left";
      const textX =
        align === "right"
          ? x + widths[index] - CELL_PADDING_X
          : align === "center"
            ? x + widths[index] / 2
            : x + CELL_PADDING_X;
      this.doc.text(column.header, textX, y0 + height / 2 + 1.2, { align });
      x += widths[index];
      if (index < columns.length - 1) {
        this.doc.line(x, y0, x, y0 + height);
      }
    });

    this.y = y0 + height;
  }

  private drawBodyRow(
    columns: Column[],
    widths: number[],
    lines: string[][],
    height: number,
  ): void {
    const y0 = this.y;
    this.doc.setDrawColor(...LINE);
    this.doc.setLineWidth(0.2);
    this.doc.rect(MARGIN_X, y0, CONTENT_WIDTH, height, "S");

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(BODY_FONT_SIZE);
    this.doc.setTextColor(...INK);

    let x = MARGIN_X;
    columns.forEach((column, index) => {
      const align = column.align ?? "left";
      const textX =
        align === "right"
          ? x + widths[index] - CELL_PADDING_X
          : align === "center"
            ? x + widths[index] / 2
            : x + CELL_PADDING_X;
      lines[index].forEach((line, lineIndex) => {
        this.doc.text(
          line,
          textX,
          y0 + CELL_PADDING_Y + BODY_LINE_HEIGHT * (lineIndex + 1) - 1.2,
          { align },
        );
      });
      x += widths[index];
      if (index < columns.length - 1) {
        this.doc.line(x, y0, x, y0 + height);
      }
    });

    this.y = y0 + height;
  }

  private table(columns: Column[], rows: Cell[][]): void {
    const widths = this.columnWidths(columns);
    const headerHeight = 7.5;

    this.drawHeaderRow(columns, widths, headerHeight);

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(BODY_FONT_SIZE);

    for (const row of rows) {
      const lines = row.map(
        (cell, index) =>
          this.doc.splitTextToSize(
            cell || "",
            Math.max(widths[index] - CELL_PADDING_X * 2, 4),
          ) as string[],
      );
      const lineCount = Math.max(1, ...lines.map((l) => l.length));
      const height = lineCount * BODY_LINE_HEIGHT + CELL_PADDING_Y * 2;

      if (this.y + height > PAGE_HEIGHT - MARGIN_BOTTOM) {
        this.newPage();
        this.drawHeaderRow(columns, widths, headerHeight);
      }
      this.drawBodyRow(columns, widths, lines, height);
    }

    this.y += 6;
  }

  private empty(text: string): void {
    this.doc.setFont("helvetica", "italic");
    this.doc.setFontSize(BODY_FONT_SIZE);
    this.doc.setTextColor(...MUTED);
    this.doc.text(text, MARGIN_X, this.y + 3);
    this.y += 10;
  }

  renderBlock(block: Block): void {
    if (block.kind === "empty") {
      if (block.caption) this.caption(block.caption);
      this.empty(block.text);
      return;
    }
    if (block.caption) this.caption(block.caption);
    if (block.rows.length === 0) {
      this.empty("Sin datos para el periodo seleccionado.");
      return;
    }
    this.table(block.columns, block.rows);
  }

  save(filename: string): void {
    const pages = this.doc.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      this.doc.setPage(page);
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8);
      this.doc.setTextColor(...MUTED);
      this.doc.text(this.title, MARGIN_X, PAGE_HEIGHT - 8);
      this.doc.text(
        `Página ${page} de ${pages}`,
        PAGE_WIDTH - MARGIN_X,
        PAGE_HEIGHT - 8,
        { align: "right" },
      );
    }
    this.doc.save(filename);
  }
}

function summaryBlock(caption: string, rows: [string, string][]): Block {
  return {
    kind: "table",
    caption,
    columns: [
      { header: "Concepto", weight: 3 },
      { header: "Valor", weight: 2, align: "right" },
    ],
    rows: rows.map(([concept, value]) => [concept, value]),
  };
}

function buildDashboard(data: DashboardSummaryData): Block[] {
  const blocks: Block[] = [
    summaryBlock("Resumen", [
      ["Ventas netas del periodo", money(data.netSales)],
      ["Crecimiento vs periodo anterior", percent(data.growthPct)],
      ["Ticket promedio", money(data.avgTicket)],
      ["Órdenes procesadas", integer(data.ordersVolume)],
      ["Pedidos pendientes", integer(data.pendingOrders)],
      ["Tasa de anulaciones", `${data.cancelledPct}%`],
      ["Costo de anulaciones", money(data.cancellationsCost)],
      ["Descuentos aplicados", money(data.discountsTotal)],
      ["Tiempo promedio de entrega", `${data.avgDeliveryMinutes} min`],
      ["Hora pico", data.peakHour != null ? hourLabel(data.peakHour) : "—"],
      [
        "Categoría estrella",
        data.bestCategory
          ? (FlavorCategoryLabel[data.bestCategory] ?? data.bestCategory)
          : "—",
      ],
      ["Margen de toppings / extras", `${data.toppingsMarginPct}%`],
      ["Rotación del menú", `${data.menuRotationPct}%`],
    ]),
  ];

  const payments = data.paymentsToday ?? [];
  if (payments.length > 0) {
    const total = payments.reduce((acc, p) => acc + p.revenue, 0);
    blocks.push({
      kind: "table",
      caption: "Métodos de pago",
      columns: [
        { header: "Método", weight: 3 },
        { header: "Órdenes", weight: 2, align: "right" },
        { header: "Ingresos", weight: 2.4, align: "right" },
        { header: "Participación", weight: 2, align: "right" },
      ],
      rows: payments.map((p) => [
        PaymentMethodLabel[p.method] ?? p.method,
        integer(p.orders),
        money(p.revenue),
        total > 0 ? `${Math.round((p.revenue / total) * 100)}%` : "—",
      ]),
    });
  }

  const staff = data.staffPerformance ?? [];
  if (staff.length > 0) {
    blocks.push({
      kind: "table",
      caption: "Rendimiento por empleado",
      columns: [
        { header: "Empleado", weight: 3 },
        { header: "Órdenes", weight: 2, align: "right" },
        { header: "Recaudado", weight: 2.4, align: "right" },
      ],
      rows: staff.map((s) => [
        s.userName,
        integer(s.ordersProcessed),
        money(s.revenueTotal),
      ]),
    });
  }

  return blocks;
}

function buildDaily(data: DailyReportData): Block[] {
  const blocks: Block[] = [
    summaryBlock("Resumen", [
      ["Ingresos totales", money(data.revenueTotal)],
      ["Órdenes", integer(data.ordersTotal)],
      ["Ticket promedio", money(data.avgTicket)],
      ["Bebidas vendidas", integer(data.itemsSold)],
      ["Ingreso por toppings", money(data.toppingsRevenue)],
      ["Descuentos aplicados", money(data.discountsTotal ?? 0)],
      ["Anulaciones", integer(data.cancellationsCount ?? 0)],
    ]),
  ];

  if (data.paymentBreakdown && data.paymentBreakdown.length > 0) {
    blocks.push({
      kind: "table",
      caption: "Métodos de pago",
      columns: [
        { header: "Método", weight: 3 },
        { header: "Órdenes", weight: 2, align: "right" },
        { header: "Ingresos", weight: 2.4, align: "right" },
      ],
      rows: data.paymentBreakdown.map((p) => [
        PaymentMethodLabel[p.method] ?? p.method,
        integer(p.orders),
        money(p.revenue),
      ]),
    });
  }

  blocks.push({
    kind: "table",
    caption: "Ventas por categoría",
    columns: [
      { header: "Categoría", weight: 3 },
      { header: "Órdenes", weight: 1.6, align: "right" },
      { header: "Unidades", weight: 1.6, align: "right" },
      { header: "Ingresos", weight: 2.2, align: "right" },
    ],
    rows: (data.byCategory ?? []).map((c) => [
      c.label,
      integer(c.orders),
      integer(c.units),
      money(c.revenue),
    ]),
  });

  return blocks;
}

function buildDayTotal(data: DayTotalData): Block[] {
  const summary = data.summary;
  return [
    summaryBlock("Resumen", [
      ["Órdenes totales", integer(summary.ordersTotal)],
      ["Ingresos brutos", money(summary.revenueTotal)],
      ["Descuentos", money(summary.discountsTotal)],
      ["Neto cobrado", money(summary.netTotal)],
    ]),
    {
      kind: "table",
      caption: "Detalle de ventas",
      columns: [
        { header: "# Ticket", weight: 1.1 },
        { header: "Fecha y hora", weight: 2.2 },
        { header: "Cliente", weight: 2.6 },
        { header: "Monto", weight: 1.5, align: "right" },
        { header: "Descuento", weight: 1.5, align: "right" },
        { header: "Motivo", weight: 2 },
      ],
      rows: (data.orders ?? []).map((o) => [
        paddedTicket(o.daySeq ?? o.seq),
        formatDateTime(o.createdAt),
        o.customerName ?? "—",
        money(o.total),
        o.discountAmount > 0 ? money(o.discountAmount) : "—",
        o.discountReason ?? "—",
      ]),
    },
  ];
}

function buildSalesRange(data: SalesRangeData): Block[] {
  const summary = data.summary;
  return [
    summaryBlock("Resumen", [
      ["Ingresos del periodo", money(summary.revenueTotal)],
      ["Órdenes", integer(summary.ordersTotal)],
      ["Ticket promedio", money(summary.avgTicket)],
      ["Mejor día", summary.bestDay?.date ?? "—"],
      ["Ingreso del mejor día", summary.bestDay ? money(summary.bestDay.revenue) : "—"],
      [
        "Variación vs periodo anterior",
        summary.comparisonPrevPeriod
          ? percent(summary.comparisonPrevPeriod.revenueDeltaPct)
          : "—",
      ],
    ]),
    {
      kind: "table",
      caption: "Evolución",
      columns: [
        { header: "Periodo", weight: 3 },
        { header: "Órdenes", weight: 2, align: "right" },
        { header: "Ingresos", weight: 2.4, align: "right" },
        { header: "Ticket promedio", weight: 2.4, align: "right" },
      ],
      rows: (data.series ?? []).map((s) => [
        s.bucket,
        integer(s.orders),
        money(s.revenue),
        money(s.avgTicket),
      ]),
    },
  ];
}

function buildPeakHours(data: PeakHoursData): Block[] {
  return [
    summaryBlock("Resumen", [
      ["Hora pico", data.peakHour ? hourLabel(data.peakHour.hour) : "—"],
      ["Órdenes en hora pico", data.peakHour ? integer(data.peakHour.orders) : "—"],
      [
        "Hora más tranquila (con venta)",
        data.quietHour ? hourLabel(data.quietHour.hour) : "—",
      ],
    ]),
    {
      kind: "table",
      caption: "Detalle por hora",
      columns: [
        { header: "Hora", weight: 2 },
        { header: "Órdenes", weight: 2, align: "right" },
        { header: "Ingresos", weight: 2.4, align: "right" },
      ],
      rows: (data.hourly ?? []).map((h) => [
        hourLabel(h.hour),
        integer(h.orders),
        money(h.revenue),
      ]),
    },
  ];
}

function buildCategorySales(data: CategorySalesData): Block[] {
  return [
    {
      kind: "table",
      caption: "Ventas por categoría",
      columns: [
        { header: "Categoría", weight: 3 },
        { header: "Unidades", weight: 1.6, align: "right" },
        { header: "Ingresos", weight: 2.2, align: "right" },
        { header: "Participación", weight: 2, align: "right" },
        { header: "Precio promedio", weight: 2.2, align: "right" },
      ],
      rows: (data.categories ?? []).map((c) => [
        c.label,
        integer(c.unitsSold),
        money(c.revenue),
        `${c.sharePct}%`,
        money(c.avgTicketItem),
      ]),
    },
  ];
}

function buildTopProducts(rows: TopProductRow[]): Block[] {
  return [
    {
      kind: "table",
      caption: "Productos más vendidos",
      columns: [
        { header: "#", weight: 0.8, align: "right" },
        { header: "Producto", weight: 3.6 },
        { header: "Unidades", weight: 1.5, align: "right" },
        { header: "Precio unitario", weight: 1.9, align: "right" },
        { header: "Subtotal", weight: 1.9, align: "right" },
      ],
      rows: rows.map((r) => [
        String(r.rank),
        r.key,
        integer(r.unitsSold),
        money(r.unitPrice ?? r.unitPriceAvg),
        money(r.revenue),
      ]),
    },
  ];
}

function buildSlowMovers(rows: SlowMoverRow[]): Block[] {
  return [
    {
      kind: "table",
      caption: "Productos de baja rotación",
      columns: [
        { header: "Combinación", weight: 4 },
        { header: "Unidades", weight: 1.8, align: "right" },
        { header: "Ingresos", weight: 2.2, align: "right" },
        { header: "Disponible", weight: 1.6, align: "center" },
      ],
      rows: rows.map((r) => [
        r.key,
        integer(r.unitsSold),
        money(r.revenue),
        r.available ? "Sí" : "No",
      ]),
    },
  ];
}

function buildStaffPerformance(rows: StaffPerformanceRow[]): Block[] {
  return [
    {
      kind: "table",
      caption: "Rendimiento del personal",
      columns: [
        { header: "Usuario", weight: 3 },
        { header: "Órdenes", weight: 1.8, align: "right" },
        { header: "Recaudado", weight: 2.2, align: "right" },
        { header: "Ticket promedio", weight: 2.2, align: "right" },
        { header: "Participación", weight: 1.9, align: "right" },
      ],
      rows: rows.map((r) => [
        r.user.name,
        integer(r.ordersProcessed),
        money(r.revenueTotal),
        money(r.avgTicket),
        `${r.shareOfRevenuePct}%`,
      ]),
    },
  ];
}

function buildAdjustments(data: AdjustmentsData): Block[] {
  const summary = data.summary;
  return [
    summaryBlock("Resumen", [
      ["Descuentos aplicados", integer(summary.discountsCount)],
      ["Total descontado", money(summary.discountsTotal)],
      ["Anulaciones", integer(summary.cancellationsCount)],
      ["Ingreso perdido por anulaciones", money(summary.cancellationsLostRevenue)],
    ]),
    {
      kind: "table",
      caption: "Detalle",
      columns: [
        { header: "Tipo", weight: 1.8 },
        { header: "Pedido", weight: 1.4 },
        { header: "Monto", weight: 1.5, align: "right" },
        { header: "Motivo", weight: 2.6 },
        { header: "Responsable", weight: 2.1 },
        { header: "Momento", weight: 2.2 },
      ],
      rows: (data.items ?? []).map((item) => [
        item.type === "cancellation" ? "Anulación" : "Descuento",
        paddedTicket(item.orderSeq),
        money(item.amount),
        item.reason || "—",
        item.byUser?.name ?? "—",
        formatDateTime(item.at),
      ]),
    },
  ];
}

function buildPayments(data: PaymentsData): Block[] {
  const summary = data.summary;
  return [
    summaryBlock("Resumen", [
      ["Ingresos del periodo", money(summary.revenueTotal)],
      ["Órdenes pagadas", integer(summary.ordersTotal)],
      ["Métodos activos", integer(summary.methodsCount)],
    ]),
    {
      kind: "table",
      caption: "Detalle por método",
      columns: [
        { header: "Método de pago", weight: 3.4 },
        { header: "Órdenes", weight: 2, align: "right" },
        { header: "Ingresos", weight: 2.4, align: "right" },
      ],
      rows: (data.breakdown ?? []).map((b) => [
        PaymentMethodLabel[b.method] ?? b.method,
        integer(b.orders),
        money(b.revenue),
      ]),
    },
  ];
}

function buildBlocks(report: ReportKey, data: unknown): Block[] {
  switch (report) {
    case "dashboard":
      return buildDashboard(data as DashboardSummaryData);
    case "daily":
      return buildDaily(data as DailyReportData);
    case "day-total":
      return buildDayTotal(data as DayTotalData);
    case "sales-range":
      return buildSalesRange(data as SalesRangeData);
    case "peak-hours":
      return buildPeakHours(data as PeakHoursData);
    case "category-sales":
      return buildCategorySales(data as CategorySalesData);
    case "top-products":
      return buildTopProducts((data as TopProductRow[]) ?? []);
    case "slow-movers":
      return buildSlowMovers((data as SlowMoverRow[]) ?? []);
    case "staff-performance":
      return buildStaffPerformance((data as StaffPerformanceRow[]) ?? []);
    case "adjustments":
      return buildAdjustments(data as AdjustmentsData);
    case "payments":
      return buildPayments(data as PaymentsData);
  }
}

export function exportReportToPdf(
  report: ReportKey,
  data: unknown,
  from: string,
  to: string,
): void {
  const title = REPORT_TITLES[report] ?? "Reporte";
  const generatedAt = new Date().toLocaleString("es-BO", {
    timeZone: "America/La_Paz",
    dateStyle: "short",
    timeStyle: "short",
  });
  const period =
    report === "daily"
      ? `Fecha: ${formatShortDate(to)}`
      : from === to
        ? `Fecha: ${formatShortDate(from)}`
        : `Periodo: ${formatShortDate(from)} al ${formatShortDate(to)}`;

  const pdf = new PdfReport(title, [
    period,
    `Generado: ${generatedAt}`,
  ]);

  for (const block of buildBlocks(report, data)) {
    pdf.renderBlock(block);
  }

  const filename =
    report === "daily"
      ? `reporte-cierre-${to}.pdf`
      : `reporte-${report}-${from}_${to}.pdf`;
  pdf.save(filename);
}
