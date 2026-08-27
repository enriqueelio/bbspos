"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useTransition,
  useState,
  type ReactNode,
} from "react";
import { FileSpreadsheet, FileDown, Printer } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  printSummaryReport,
  printDailyReport,
} from "@/app/actions/print-report";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@bubba/ui";
import type {
  AdjustmentsData,
  CategorySalesData,
  DailyReportData,
  DashboardSummaryData,
  Granularity,
  PeakHoursData,
  ReportEnvelope,
  SalesRangeData,
  SlowMoverRow,
  StaffPerformanceRow,
  TopProductRow,
} from "@bubba/types";
import {
  FlavorCategoryLabel,
  formatPrice,
  PaymentMethodLabel,
} from "@bubba/types";
import { exportReportToExcel, type ReportKey } from "@/lib/reports/excel";

const REPORT_TABS: { key: ReportKey; label: string; needsRange: boolean }[] = [
  { key: "dashboard", label: "Resumen", needsRange: false },
  { key: "daily", label: "Cierre diario", needsRange: false },
  { key: "sales-range", label: "Evolución de ventas", needsRange: true },
  { key: "peak-hours", label: "Horas pico", needsRange: true },
  { key: "category-sales", label: "Por categoría", needsRange: true },
  { key: "top-products", label: "Top productos", needsRange: true },
  { key: "slow-movers", label: "Baja rotación", needsRange: true },
  { key: "staff-performance", label: "Personal", needsRange: true },
  { key: "adjustments", label: "Anulaciones y descuentos", needsRange: true },
];

function todayStr(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function pct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}%`;
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="p-8 text-center text-sm text-muted-foreground">
        {text}
      </CardContent>
    </Card>
  );
}

export function ReportsClient({
  initialReport,
}: {
  initialReport?: string;
}) {
  const validInitial = REPORT_TABS.some((t) => t.key === initialReport)
    ? (initialReport as ReportKey)
    : "dashboard";
  const [report, setReport] = useState<ReportKey>(validInitial);
  const [from, setFrom] = useState(daysAgoStr(6));
  const [to, setTo] = useState(todayStr());
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [hourFrom, setHourFrom] = useState(11);
  const [hourTo, setHourTo] = useState(23);
  const [topOnly, setTopOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printMsg, setPrintMsg] = useState<string | null>(null);
  const [isPrinting, startPrintTransition] = useTransition();
  const [isExportingPdf, setExportingPdf] = useState(false);
  const pdfAreaRef = useRef<HTMLDivElement>(null);

  const tab = useMemo(
    () => REPORT_TABS.find((t) => t.key === report)!,
    [report],
  );

  const rangeQuery = useMemo(() => {
    const params = new URLSearchParams({ from, to });
    if (report === "sales-range") {
      params.set("granularity", granularity);
    }
    if (report === "peak-hours") {
      params.set("hourFrom", String(hourFrom));
      params.set("hourTo", String(hourTo));
    }
    if (report === "top-products" && topOnly) {
      params.set("limit", "10");
    }
    return params.toString();
  }, [from, to, granularity, report, hourFrom, hourTo, topOnly]);

  const fetchData = useCallback(
    async <T,>(endpoint: string): Promise<T | null> => {
      setError(null);
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/${endpoint}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as
            | { error?: { message?: string } }
            | null;
          throw new Error(
            body?.error?.message ?? `Error ${res.status} al consultar el reporte.`,
          );
        }
        const body = (await res.json()) as ReportEnvelope<T>;
        return body.data;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error inesperado.");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const [fetched, setFetched] = useState<{
    key: ReportKey;
    payload: unknown;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setFetched(null);
    (async () => {
      let result: unknown = null;
      switch (report) {
        case "dashboard":
          result = await fetchData<DashboardSummaryData>("dashboard-summary");
          break;
        case "daily":
          result = await fetchData<DailyReportData>(
            `daily?date=${encodeURIComponent(to)}`,
          );
          break;
        case "sales-range":
          result = await fetchData<SalesRangeData>(
            `sales-range?${rangeQuery}`,
          );
          break;
        case "peak-hours":
          result = await fetchData<PeakHoursData>(`peak-hours?${rangeQuery}`);
          break;
        case "category-sales":
          result = await fetchData<CategorySalesData>(
            `category-sales?${rangeQuery}`,
          );
          break;
        case "top-products":
          result = await fetchData<TopProductRow[]>(
            `top-products?${rangeQuery}`,
          );
          break;
        case "slow-movers":
          result = await fetchData<SlowMoverRow[]>(`slow-movers?${rangeQuery}`);
          break;
        case "staff-performance":
          result = await fetchData<StaffPerformanceRow[]>(
            `staff-performance?${rangeQuery}`,
          );
          break;
        case "adjustments":
          result = await fetchData<AdjustmentsData>(`adjustments?${rangeQuery}`);
          break;
      }
      if (!cancelled) setFetched({ key: report, payload: result });
    })();
    return () => {
      cancelled = true;
    };
  }, [report, rangeQuery, to, fetchData]);

  const handlePrint = () => {
    setPrintMsg(null);
    startPrintTransition(async () => {
      try {
        const msg =
          report === "daily"
            ? await printDailyReport(to)
            : await printSummaryReport();
        setPrintMsg(msg);
      } catch (e) {
        setPrintMsg(e instanceof Error ? e.message : "No se pudo imprimir.");
      }
    });
  };

  const exportPdf = async () => {
    const area = pdfAreaRef.current;
    if (!area) return;
    setExportingPdf(true);
    try {
      const canvas = await html2canvas(area, { scale: 2, backgroundColor: "#ffffff" });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(img, "PNG", 0, position, imgW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position -= pageH;
        pdf.addPage();
        pdf.addImage(img, "PNG", 0, position, imgW, imgH);
        heightLeft -= pageH;
      }
      pdf.save(
        report === "daily" ? `reporte-cierre-${to}.pdf` : `reporte-${report}.pdf`,
      );
    } catch {
      setPrintMsg("No se pudo generar el PDF.");
    } finally {
      setExportingPdf(false);
    }
  };

  const canPrint =
    (report === "dashboard" || report === "daily") &&
    fetched !== null &&
    fetched.key === report;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reportes</h1>
          <p className="text-muted-foreground">
            Métricas del negocio: ventas, producto y personal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canPrint && (
            <Button
              variant="outline"
              size="sm"
              disabled={isPrinting}
              onClick={handlePrint}
            >
              <Printer className="mr-1 h-4 w-4" />
              {isPrinting ? "Imprimiendo…" : "Imprimir"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={!fetched || fetched.key !== report || isExportingPdf}
            onClick={exportPdf}
          >
            <FileDown className="mr-1 h-4 w-4" />
            {isExportingPdf ? "Generando…" : "Exportar PDF"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!fetched || fetched.key !== report}
            onClick={() => {
              if (!fetched || fetched.key !== report) return;
              const reportDate = report === "daily" ? to : undefined;
              exportReportToExcel(
                report,
                fetched.payload,
                from,
                reportDate ?? to,
              );
            }}
          >
            <FileSpreadsheet className="mr-1 h-4 w-4" /> Exportar Excel
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {REPORT_TABS.map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant={report === t.key ? "default" : "outline"}
            onClick={() => setReport(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab.needsRange && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label htmlFor="reports-from" className="text-sm font-medium">
              Desde
            </label>
            <Input
              id="reports-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="reports-to" className="text-sm font-medium">
              Hasta
            </label>
            <Input
              id="reports-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          {report === "sales-range" && (
            <div className="space-y-1">
              <label htmlFor="reports-gran" className="text-sm font-medium">
                Agrupar por
              </label>
              <select
                id="reports-gran"
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                value={granularity}
                onChange={(e) =>
                  setGranularity(e.target.value as Granularity)
                }
              >
                <option value="day">Día</option>
                <option value="week">Semana</option>
                <option value="month">Mes</option>
              </select>
            </div>
          )}
          {report === "peak-hours" && (
            <>
              <div className="space-y-1">
                <label htmlFor="reports-hour-from" className="text-sm font-medium">
                  Desde hora
                </label>
                <select
                  id="reports-hour-from"
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                  value={hourFrom}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setHourFrom(v);
                    if (v > hourTo) setHourTo(v);
                  }}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="reports-hour-to" className="text-sm font-medium">
                  Hasta hora
                </label>
                <select
                  id="reports-hour-to"
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                  value={hourTo}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setHourTo(v);
                    if (v < hourFrom) setHourFrom(v);
                  }}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      )}

      {report === "top-products" && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={topOnly ? "default" : "outline"}
            onClick={() => setTopOnly(!topOnly)}
          >
            {topOnly ? "Top 10" : "Todos los productos"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {topOnly ? "Mostrando los 10 más vendidos" : "Mostrando todos los productos"}
          </span>
        </div>
      )}

      {loading && (
        <p className="text-sm text-muted-foreground">Cargando reporte…</p>
      )}
      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {!loading && !error && fetched !== null && fetched.key === report ? (
        <div ref={pdfAreaRef}>
          <ReportBody report={report} data={fetched.payload} />
        </div>
      ) : null}

      {printMsg && (
        <p className="rounded-md border px-3 py-2 text-sm">
          {printMsg}
        </p>
      )}
    </div>
  );
}

function ReportBody({ report, data }: { report: ReportKey; data: unknown }) {
  switch (report) {
    case "dashboard":
      return <DashboardView data={data as DashboardSummaryData} />;
    case "daily":
      return <DailyView data={data as DailyReportData} />;
    case "sales-range":
      return <SalesRangeView data={data as SalesRangeData} />;
    case "peak-hours":
      return <PeakHoursView data={data as PeakHoursData} />;
    case "category-sales":
      return <CategorySalesView data={data as CategorySalesData} />;
    case "top-products":
      return <TopProductsView rows={(data as TopProductRow[]) ?? []} />;
    case "slow-movers":
      return <SlowMoversView rows={(data as SlowMoverRow[]) ?? []} />;
    case "staff-performance":
      return (
        <StaffPerformanceView rows={(data as StaffPerformanceRow[]) ?? []} />
      );
    case "adjustments":
      return <AdjustmentsView data={data as AdjustmentsData} />;
  }
}

type Column<T> = { header: string; cell: (row: T) => ReactNode };

function DataTable<T>({
  columns,
  rows,
  emptyText,
}: {
  columns: Column<T>[];
  rows?: T[] | null;
  emptyText: string;
}) {
  const safeRows = rows ?? [];
  if (safeRows.length === 0) {
    return <EmptyState text={emptyText} />;
  }
  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              {columns.map((c, i) => (
                <th key={i} className="px-4 py-2 font-medium">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {safeRows.map((row, ri) => (
              <tr key={ri} className="border-b last:border-b-0">
                {columns.map((c, ci) => (
                  <td key={ci} className="px-4 py-2">
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function DashboardView({ data }: { data: DashboardSummaryData }) {
  const today = data.today ?? { revenue: 0, orders: 0, avgTicket: 0 };
  const delta = data.deltaPct ?? { revenue: null, orders: null };
  const last7 =
    data.last7Days ?? { revenue: 0, orders: 0, avgTicket: 0 };
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Ventas hoy"
          value={formatPrice(today.revenue)}
          hint={`vs ayer ${pct(delta.revenue)}`}
        />
        <KpiCard
          label="Pedidos hoy"
          value={String(today.orders)}
          hint={`vs ayer ${pct(delta.orders)}`}
        />
        <KpiCard label="Ticket promedio hoy" value={formatPrice(today.avgTicket)} />
        <KpiCard label="Pedidos pendientes" value={String(data.pendingOrders ?? 0)} />
      </div>
      <KpiCard
        label="Últimos 7 días"
        value={formatPrice(last7.revenue)}
        hint={`${last7.orders} pedidos · ticket promedio ${formatPrice(last7.avgTicket)}`}
      />
    </div>
  );
}

function DailyView({ data }: { data: DailyReportData }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={`Ingresos (${data.date})`} value={formatPrice(data.revenueTotal)} />
        <KpiCard label="Órdenes" value={String(data.ordersTotal)} />
        <KpiCard label="Ticket promedio" value={formatPrice(data.avgTicket)} />
        <KpiCard
          label="Bebidas vendidas"
          value={String(data.itemsSold)}
          hint={`Toppings: ${formatPrice(data.toppingsRevenue)}`}
        />
      </div>
      {(data.discountsTotal ?? 0) > 0 || (data.cancellationsCount ?? 0) > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <KpiCard label="Descuentos aplicados" value={formatPrice(data.discountsTotal ?? 0)} />
          <KpiCard
            label="Anulaciones"
            value={String(data.cancellationsCount ?? 0)}
          />
        </div>
      ) : null}
      {data.paymentBreakdown && data.paymentBreakdown.length > 0 ? (
        <DataTable
          columns={[
            { header: "Método de pago", cell: (r) => PaymentMethodLabel[r.method] ?? r.method },
            { header: "Órdenes", cell: (r) => r.orders },
            { header: "Ingresos", cell: (r) => formatPrice(r.revenue) },
          ]}
          rows={data.paymentBreakdown}
          emptyText="Sin pagos registrados."
        />
      ) : null}
      <DataTable
        columns={[
          { header: "Categoría", cell: (r) => FlavorCategoryLabel[r.category] },
          { header: "Órdenes", cell: (r) => r.orders },
          { header: "Unidades", cell: (r) => r.units },
          { header: "Ingresos", cell: (r) => formatPrice(r.revenue) },
        ]}
        rows={data.byCategory}
        emptyText="Sin ventas en el día."
      />
    </div>
  );
}

function SalesRangeView({ data }: { data: SalesRangeData }) {
  const summary = data.summary ?? {
    revenueTotal: 0,
    ordersTotal: 0,
    avgTicket: 0,
    bestDay: null,
    comparisonPrevPeriod: null,
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Ingresos del periodo" value={formatPrice(summary.revenueTotal)} />
        <KpiCard label="Órdenes" value={String(summary.ordersTotal)} />
        <KpiCard label="Ticket promedio" value={formatPrice(summary.avgTicket)} />
        <KpiCard
          label="Mejor día"
          value={
            summary.bestDay
              ? formatPrice(summary.bestDay.revenue)
              : "—"
          }
          hint={summary.bestDay?.date}
        />
      </div>
      {summary.comparisonPrevPeriod && (
        <p className="text-sm text-muted-foreground">
          Variación contra el periodo anterior:{" "}
          <Badge variant="secondary">
            {pct(summary.comparisonPrevPeriod.revenueDeltaPct)}
          </Badge>{" "}
          en ingresos.
        </p>
      )}
      <DataTable
        columns={[
          { header: "Periodo", cell: (r) => r.bucket },
          { header: "Órdenes", cell: (r) => r.orders },
          { header: "Ingresos", cell: (r) => formatPrice(r.revenue) },
          { header: "Ticket promedio", cell: (r) => formatPrice(r.avgTicket) },
        ]}
        rows={data.series}
        emptyText="Sin ventas en el rango."
      />
    </div>
  );
}

function PeakHoursView({ data }: { data: PeakHoursData }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard
          label="Hora pico"
          value={
            data.peakHour ? `${String(data.peakHour.hour).padStart(2, "0")}:00` : "—"
          }
          hint={data.peakHour ? `${data.peakHour.orders} órdenes` : undefined}
        />
        <KpiCard
          label="Hora más tranquila (con venta)"
          value={
            data.quietHour ? `${String(data.quietHour.hour).padStart(2, "0")}:00` : "—"
          }
          hint={data.quietHour ? `${data.quietHour.orders} órdenes` : undefined}
        />
      </div>
      <DataTable
        columns={[
          { header: "Hora", cell: (r) => `${String(r.hour).padStart(2, "0")}:00` },
          { header: "Órdenes", cell: (r) => r.orders },
          { header: "Ingresos", cell: (r) => formatPrice(r.revenue) },
        ]}
        rows={data.hourly}
        emptyText="Sin datos."
      />
    </div>
  );
}

function CategorySalesView({ data }: { data: CategorySalesData }) {
  return (
    <DataTable
      columns={[
        { header: "Categoría", cell: (r) => FlavorCategoryLabel[r.category] },
        { header: "Unidades", cell: (r) => r.unitsSold },
        { header: "Ingresos", cell: (r) => formatPrice(r.revenue) },
        { header: "Participación", cell: (r) => `${r.sharePct}%` },
        { header: "Precio promedio", cell: (r) => formatPrice(r.avgTicketItem) },
      ]}
      rows={data.categories}
      emptyText="Sin ventas en el rango."
    />
  );
}

function TopProductsView({ rows }: { rows: TopProductRow[] }) {
  return (
    <DataTable
      columns={[
        { header: "#", cell: (r) => r.rank },
        { header: "Producto", cell: (r) => r.key },
        { header: "Unidades", cell: (r) => r.unitsSold },
        { header: "Ingresos", cell: (r) => formatPrice(r.revenue) },
        { header: "Precio promedio", cell: (r) => formatPrice(r.unitPriceAvg) },
      ]}
      rows={rows}
      emptyText="Sin ventas en el rango."
    />
  );
}

function SlowMoversView({ rows }: { rows: SlowMoverRow[] }) {
  return (
    <DataTable
      columns={[
        { header: "Combinación", cell: (r) => r.key },
        { header: "Unidades", cell: (r) => r.unitsSold },
        { header: "Ingresos", cell: (r) => formatPrice(r.revenue) },
        {
          header: "Disponible",
          cell: (r) => (
            <Badge variant={r.available ? "success" : "secondary"}>
              {r.available ? "Sí" : "No"}
            </Badge>
          ),
        },
      ]}
      rows={rows}
      emptyText="Sin datos para el rango."
    />
  );
}

function StaffPerformanceView({ rows }: { rows: StaffPerformanceRow[] }) {
  return (
    <DataTable
      columns={[
        { header: "Usuario", cell: (r) => r.user.name },
        { header: "Órdenes procesadas", cell: (r) => r.ordersProcessed },
        { header: "Recaudado", cell: (r) => formatPrice(r.revenueTotal) },
        { header: "Ticket promedio", cell: (r) => formatPrice(r.avgTicket) },
        { header: "Participación", cell: (r) => `${r.shareOfRevenuePct}%` },
      ]}
      rows={rows}
      emptyText="Sin órdenes atribuidas en el rango."
    />
  );
}

function AdjustmentsView({ data }: { data: AdjustmentsData }) {
  const summary = data.summary ?? {
    discountsCount: 0,
    discountsTotal: 0,
    cancellationsCount: 0,
    cancellationsLostRevenue: 0,
  };
  const pagination = data.pagination ?? {
    page: 1,
    pageSize: 50,
    totalItems: 0,
    totalPages: 1,
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Descuentos" value={String(summary.discountsCount)} />
        <KpiCard label="Total descontado" value={formatPrice(summary.discountsTotal)} />
        <KpiCard label="Anulaciones" value={String(summary.cancellationsCount)} />
        <KpiCard
          label="Ingreso perdido por anulaciones"
          value={formatPrice(summary.cancellationsLostRevenue)}
        />
      </div>
      <DataTable
        columns={[
          {
            header: "Tipo",
            cell: (r) => (
              <Badge variant={r.type === "cancellation" ? "destructive" : "warning"}>
                {r.type === "cancellation" ? "Anulación" : "Descuento"}
              </Badge>
            ),
          },
          { header: "Pedido", cell: (r) => `#${String(r.orderSeq ?? 0).padStart(5, "0")}` },
          { header: "Monto", cell: (r) => formatPrice(r.amount) },
          { header: "Motivo", cell: (r) => r.reason || "—" },
          { header: "Responsable", cell: (r) => r.byUser?.name ?? "—" },
          {
            header: "Momento",
            cell: (r) =>
              new Date(r.at).toLocaleString("es-MX", {
                dateStyle: "short",
                timeStyle: "short",
              }),
          },
        ]}
        rows={data.items}
        emptyText="Sin anulaciones ni descuentos en el rango."
      />
      <p className="text-xs text-muted-foreground">
        Página {pagination.page} de {pagination.totalPages} ·{" "}
        {pagination.totalItems} registros
      </p>
    </div>
  );
}
