import * as XLSX from "xlsx";
import {
  FlavorCategoryLabel,
  PaymentMethodLabel,
  type AdjustmentsData,
  type CategorySalesData,
  type DailyReportData,
  type DayTotalData,
  type PeakHoursData,
  type PaymentsData,
  type SalesRangeData,
  type SlowMoverRow,
  type StaffPerformanceRow,
  type TopProductRow,
} from "@bubba/types";

export type ReportKey =
  | "dashboard"
  | "daily"
  | "day-total"
  | "sales-range"
  | "peak-hours"
  | "category-sales"
  | "top-products"
  | "slow-movers"
  | "staff-performance"
  | "adjustments"
  | "payments";

function download(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename + ".xlsx", { bookType: "xlsx" });
}

function sheetFromRows(name: string, rows: Record<string, unknown>[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = Object.keys(rows[0] ?? {}).map(() => ({ wch: 18 }));
  return { name, ws };
}

function handleDaily(data: DailyReportData, to: string) {
  const wb = XLSX.utils.book_new();

  const summaryRows = [
    { Concepto: "Ingresos totales", Valor: data.revenueTotal },
    { Concepto: "Órdenes", Valor: data.ordersTotal },
    { Concepto: "Ticket promedio", Valor: data.avgTicket },
    { Concepto: "Bebidas vendidas", Valor: data.itemsSold },
    { Concepto: "Ingreso toppings", Valor: data.toppingsRevenue },
    { Concepto: "Descuentos", Valor: data.discountsTotal ?? 0 },
    { Concepto: "Anulaciones", Valor: data.cancellationsCount ?? 0 },
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromRows("Resumen", summaryRows).ws, "Resumen");

  if (data.paymentBreakdown && data.paymentBreakdown.length > 0) {
    const rows = data.paymentBreakdown.map((r) => ({
      "Método de pago": PaymentMethodLabel[r.method] ?? r.method,
      Órdenes: r.orders,
      Ingresos: r.revenue,
    }));
    XLSX.utils.book_append_sheet(wb, sheetFromRows("Pagos", rows).ws, "Pagos");
  }

  if (data.byCategory.length > 0) {
    const rows = data.byCategory.map((r) => ({
      Categoría: FlavorCategoryLabel[r.category],
      Órdenes: r.orders,
      Unidades: r.units,
      Ingresos: r.revenue,
    }));
    XLSX.utils.book_append_sheet(wb, sheetFromRows("Categorías", rows).ws, "Categorías");
  }

  download(wb, `cierre-diario-${to}`);
}

function handleDayTotal(data: DayTotalData, from: string, to: string) {
  const wb = XLSX.utils.book_new();
  const s = data.summary;

  const summaryRows = [
    { Concepto: "Órdenes totales", Valor: s.ordersTotal },
    { Concepto: "Ingresos brutos", Valor: s.revenueTotal },
    { Concepto: "Descuentos", Valor: s.discountsTotal },
    { Concepto: "Neto cobrado", Valor: s.netTotal },
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromRows("Resumen", summaryRows).ws, "Resumen");

  if (data.orders.length > 0) {
    const rows = data.orders.map((r) => ({
      "Nº Ticket": r.seq ?? "—",
      Fecha: new Date(r.createdAt).toLocaleDateString("es-BO"),
      Hora: new Date(r.createdAt).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" }),
      Cliente: r.customerName ?? "—",
      Monto: r.total,
      Descuento: r.discountAmount || "",
      "Motivo descuento": r.discountReason ?? "",
    }));
    XLSX.utils.book_append_sheet(wb, sheetFromRows("Detalle", rows).ws, "Detalle");
  }

  download(wb, `ventas-totales-${from}_${to}`);
}

function handleSalesRange(data: SalesRangeData, from: string, to: string) {
  const wb = XLSX.utils.book_new();
  const s = data.summary;

  const summaryRows = [
    { Concepto: "Ingresos totales", Valor: s.revenueTotal },
    { Concepto: "Órdenes", Valor: s.ordersTotal },
    { Concepto: "Ticket promedio", Valor: s.avgTicket },
    { Concepto: "Mejor día", Valor: s.bestDay?.date ?? "—" },
    { Concepto: "Ingreso mejor día", Valor: s.bestDay?.revenue ?? 0 },
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromRows("Resumen", summaryRows).ws, "Resumen");

  if (data.series.length > 0) {
    const rows = data.series.map((r) => ({
      Periodo: r.bucket,
      Órdenes: r.orders,
      Ingresos: r.revenue,
      "Ticket promedio": r.avgTicket,
    }));
    XLSX.utils.book_append_sheet(wb, sheetFromRows("Serie", rows).ws, "Serie");
  }

  download(wb, `ventas-${from}_${to}`);
}

function handlePeakHours(data: PeakHoursData, from: string, to: string) {
  const wb = XLSX.utils.book_new();

  const summaryRows = [
    { Concepto: "Hora pico", Valor: data.peakHour ? `${String(data.peakHour.hour).padStart(2, "0")}:00` : "—" },
    { Concepto: "Órdenes hora pico", Valor: data.peakHour?.orders ?? 0 },
    { Concepto: "Hora más tranquila", Valor: data.quietHour ? `${String(data.quietHour.hour).padStart(2, "0")}:00` : "—" },
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromRows("Resumen", summaryRows).ws, "Resumen");

  if (data.hourly.length > 0) {
    const rows = data.hourly.map((r) => ({
      Hora: `${String(r.hour).padStart(2, "0")}:00`,
      Órdenes: r.orders,
      Ingresos: r.revenue,
    }));
    XLSX.utils.book_append_sheet(wb, sheetFromRows("Por hora", rows).ws, "Por hora");
  }

  download(wb, `horas-pico-${from}_${to}`);
}

function handleCategorySales(data: CategorySalesData, from: string, to: string) {
  const wb = XLSX.utils.book_new();

  if (data.categories.length > 0) {
    const rows = data.categories.map((r) => ({
      Categoría: FlavorCategoryLabel[r.category],
      Unidades: r.unitsSold,
      Ingresos: r.revenue,
      "Participación %": r.sharePct,
      "Precio promedio": r.avgTicketItem,
    }));
    XLSX.utils.book_append_sheet(wb, sheetFromRows("Por categoría", rows).ws, "Por categoría");
  }

  download(wb, `ventas-categoria-${from}_${to}`);
}

function handleTopProducts(rows: TopProductRow[], from: string, to: string) {
  const wb = XLSX.utils.book_new();

  if (rows.length > 0) {
    const data = rows.map((r) => ({
      "#": r.rank,
      Producto: r.key,
      Unidades: r.unitsSold,
      Ingresos: r.revenue,
      "Precio promedio": r.unitPriceAvg,
    }));
    XLSX.utils.book_append_sheet(wb, sheetFromRows("Top productos", data).ws, "Top productos");
  }

  download(wb, `top-productos-${from}_${to}`);
}

function handleSlowMovers(rows: SlowMoverRow[], from: string, to: string) {
  const wb = XLSX.utils.book_new();

  if (rows.length > 0) {
    const data = rows.map((r) => ({
      Combinación: r.key,
      Unidades: r.unitsSold,
      Ingresos: r.revenue,
      Disponible: r.available ? "Sí" : "No",
    }));
    XLSX.utils.book_append_sheet(wb, sheetFromRows("Baja rotación", data).ws, "Baja rotación");
  }

  download(wb, `baja-rotacion-${from}_${to}`);
}

function handleStaff(rows: StaffPerformanceRow[], from: string, to: string) {
  const wb = XLSX.utils.book_new();

  if (rows.length > 0) {
    const data = rows.map((r) => ({
      Usuario: r.user.name,
      "Órdenes procesadas": r.ordersProcessed,
      Recaudado: r.revenueTotal,
      "Ticket promedio": r.avgTicket,
      "Participación %": r.shareOfRevenuePct,
    }));
    XLSX.utils.book_append_sheet(wb, sheetFromRows("Personal", data).ws, "Personal");
  }

  download(wb, `rendimiento-personal-${from}_${to}`);
}

function handleAdjustments(data: AdjustmentsData, from: string, to: string) {
  const wb = XLSX.utils.book_new();
  const s = data.summary;

  const summaryRows = [
    { Concepto: "Descuentos aplicados", Valor: s.discountsCount },
    { Concepto: "Total descontado", Valor: s.discountsTotal },
    { Concepto: "Anulaciones", Valor: s.cancellationsCount },
    { Concepto: "Ingreso perdido", Valor: s.cancellationsLostRevenue },
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromRows("Resumen", summaryRows).ws, "Resumen");

  if (data.items.length > 0) {
    const rows = data.items.map((r) => ({
      Tipo: r.type === "cancellation" ? "Anulación" : "Descuento",
      Pedido: `#${String(r.orderSeq ?? 0).padStart(5, "0")}`,
      Monto: r.amount,
      Motivo: r.reason || "—",
      Responsable: r.byUser?.name ?? "—",
      Momento: new Date(r.at).toLocaleString("es-MX", {
        dateStyle: "short",
        timeStyle: "short",
      }),
    }));
    XLSX.utils.book_append_sheet(wb, sheetFromRows("Detalle", rows).ws, "Detalle");
  }

  download(wb, `anulaciones-descuentos-${from}_${to}`);
}

function handlePayments(data: PaymentsData, from: string, to: string) {
  const wb = XLSX.utils.book_new();

  const summaryRows = [
    { Concepto: "Ingresos totales", Valor: data.summary.revenueTotal },
    { Concepto: "Órdenes", Valor: data.summary.ordersTotal },
    { Concepto: "Métodos activos", Valor: data.summary.methodsCount },
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromRows("Resumen", summaryRows).ws, "Resumen");

  if (data.breakdown.length > 0) {
    const rows = data.breakdown.map((r) => ({
      "Método de pago": PaymentMethodLabel[r.method] ?? r.method,
      Órdenes: r.orders,
      Ingresos: r.revenue,
    }));
    XLSX.utils.book_append_sheet(wb, sheetFromRows("Por método", rows).ws, "Por método");
  }

  download(wb, `metodos-pago-${from}_${to}`);
}

export function exportReportToExcel(
  report: ReportKey,
  data: unknown,
  from: string,
  to: string,
) {
  switch (report) {
    case "daily":
      handleDaily(data as DailyReportData, to);
      break;
    case "day-total":
      handleDayTotal(data as DayTotalData, from, to);
      break;
    case "sales-range":
      handleSalesRange(data as SalesRangeData, from, to);
      break;
    case "peak-hours":
      handlePeakHours(data as PeakHoursData, from, to);
      break;
    case "category-sales":
      handleCategorySales(data as CategorySalesData, from, to);
      break;
    case "top-products":
      handleTopProducts((data as TopProductRow[]) ?? [], from, to);
      break;
    case "slow-movers":
      handleSlowMovers((data as SlowMoverRow[]) ?? [], from, to);
      break;
    case "staff-performance":
      handleStaff((data as StaffPerformanceRow[]) ?? [], from, to);
      break;
    case "adjustments":
      handleAdjustments(data as AdjustmentsData, from, to);
      break;
    case "payments":
      handlePayments(data as PaymentsData, from, to);
      break;
    default:
      break;
  }
}
