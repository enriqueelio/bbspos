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
import { ChevronDown, FileSpreadsheet, FileDown, Printer, Send } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  printSummaryReport,
  printDailyReport,
} from "@/app/actions/print-report";
import { sendDailyReportToBot } from "@/app/actions/daily-report";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@bbspos/ui";
import type {
  AdjustmentsData,
  CategorySalesData,
  DailyReportData,
  DashboardSummaryData,
  DayTotalData,
  Granularity,
  PeakHoursData,
  PaymentsData,
  ReportEnvelope,
  SalesRangeData,
  SlowMoverRow,
  StaffPerformanceRow,
  TopProductRow,
} from "@bbspos/types";
import {
  FlavorCategoryLabel,
  formatPrice,
  PaymentMethodLabel,
  MANUAL_REPORT_CUTOFF,
  MANUAL_REPORT_CUTOFF_MINUTES,
  zonedClockMinutes,
} from "@bbspos/types";
import { exportReportToExcel, type ReportKey } from "@/lib/reports/excel";

interface ReportTab {
  key: ReportKey;
  label: string;
  needsRange: boolean;
}

interface ReportCategory {
  key: string;
  label: string;
  tabs: ReportTab[];
}

const REPORT_GROUPS: ReportCategory[] = [
  {
    key: "financiero",
    label: "Financiero",
    tabs: [
      { key: "dashboard", label: "Resumen", needsRange: true },
      { key: "daily", label: "Cierre diario", needsRange: false },
      { key: "sales-range", label: "Evolución de ventas", needsRange: true },
      { key: "payments", label: "Métodos de pago", needsRange: true },
    ],
  },
  {
    key: "operativo",
    label: "Operativo",
    tabs: [
      { key: "peak-hours", label: "Horas pico", needsRange: true },
      { key: "top-products", label: "Top productos", needsRange: true },
      { key: "category-sales", label: "Por categoría", needsRange: true },
      { key: "day-total", label: "Ventas totales", needsRange: true },
    ],
  },
  {
    key: "auditoria",
    label: "Auditoría y Control",
    tabs: [
      { key: "adjustments", label: "Anulaciones y descuentos", needsRange: true },
      { key: "staff-performance", label: "Personal", needsRange: true },
      { key: "slow-movers", label: "Baja rotación", needsRange: true },
    ],
  },
];

const REPORT_TABS: ReportTab[] = REPORT_GROUPS.flatMap((g) => g.tabs);

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

function monthStartStr(current: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(current.getFullYear(), current.getMonth(), 1));
}

type RangePreset =
  | "today"
  | "yesterday"
  | "last7"
  | "month"
  | "custom";

const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "last7", label: "Últimos 7 días" },
  { value: "month", label: "Este mes" },
  { value: "custom", label: "Rango personalizado" },
];

function presetRange(
  preset: RangePreset,
): { from: string; to: string; isCustom: boolean } {
  const today = todayStr();
  switch (preset) {
    case "today":
      return { from: today, to: today, isCustom: false };
    case "yesterday":
      return { from: daysAgoStr(1), to: daysAgoStr(1), isCustom: false };
    case "last7":
      return { from: daysAgoStr(6), to: today, isCustom: false };
    case "month":
      return { from: monthStartStr(), to: today, isCustom: false };
    default:
      return { from: today, to: today, isCustom: true };
  }
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
        <p className="font-mono text-4xl font-bold tracking-tight">{value}</p>
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
  const [rangePreset, setRangePreset] = useState<RangePreset>("today");
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [hourFrom, setHourFrom] = useState(11);
  const [hourTo, setHourTo] = useState(23);
  const [topOnly, setTopOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printMsg, setPrintMsg] = useState<string | null>(null);
  const [isPrinting, startPrintTransition] = useTransition();
  const [cierreMsg, setCierreMsg] = useState<string | null>(null);
  const [isSendingCierre, startCierreTransition] = useTransition();
  const [clockNow, setClockNow] = useState(() => Date.now());

  // Habilita "Cierre diario" solo a partir de las 23:10 (reloj del negocio).
  useEffect(() => {
    const timer = setInterval(() => setClockNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const canSendCierre =
    zonedClockMinutes(new Date(clockNow)) >= MANUAL_REPORT_CUTOFF_MINUTES;
  const [isExportingPdf, setExportingPdf] = useState(false);
  const [isExportingExcel, setExportingExcel] = useState(false);
  const pdfAreaRef = useRef<HTMLDivElement>(null);

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
          result = await fetchData<DashboardSummaryData>(
            `dashboard-summary?${rangeQuery}`,
          );
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
        case "payments":
          result = await fetchData<PaymentsData>(`payments?${rangeQuery}`);
          break;
        case "day-total":
          result = await fetchData<DayTotalData>(`day-total?${rangeQuery}`);
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

  const handleSendCierre = () => {
    setCierreMsg(null);
    startCierreTransition(async () => {
      try {
        const msg = await sendDailyReportToBot();
        setCierreMsg(msg);
      } catch (e) {
        setCierreMsg(
          e instanceof Error ? e.message : "No se pudo enviar el reporte.",
        );
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

  const exportExcel = async () => {
    if (!fetched || fetched.key !== report) return;
    setExportingExcel(true);
    try {
      const reportDate = report === "daily" ? to : undefined;
      exportReportToExcel(report, fetched.payload, from, reportDate ?? to);
    } finally {
      setExportingExcel(false);
    }
  };

  const canPrint =
    (report === "dashboard" || report === "daily") &&
    fetched !== null &&
    fetched.key === report;

  const exporting = isExportingPdf || isExportingExcel;

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Reportes</h1>
          <p className="text-muted-foreground">
            Métricas del negocio: ventas, producto y personal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isSendingCierre || !canSendCierre}
            onClick={handleSendCierre}
            title={
              canSendCierre
                ? undefined
                : `Disponible a partir de las ${MANUAL_REPORT_CUTOFF}`
            }
          >
            <Send className="mr-1 h-4 w-4" />
            {isSendingCierre ? "Enviando…" : "Cierre diario"}
          </Button>
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
            disabled={!fetched || fetched.key !== report || exporting}
            onClick={exportPdf}
          >
            <FileDown className="mr-1 h-4 w-4" />
            {isExportingPdf ? "Generando…" : "Exportar PDF"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!fetched || fetched.key !== report || exporting}
            onClick={exportExcel}
          >
            <FileSpreadsheet className="mr-1 h-4 w-4" />
            {isExportingExcel ? "Exportando…" : "Exportar Excel"}
          </Button>
        </div>
        {cierreMsg && (
          <p className="basis-full text-sm text-primary">{cierreMsg}</p>
        )}
        {!canSendCierre && (
          <p className="basis-full text-sm text-muted-foreground">
            El cierre diario se habilita a partir de las {MANUAL_REPORT_CUTOFF}.
          </p>
        )}
      </div>

      {/* Filtro de fechas global (persistente en todas las pestañas). */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Rango
            </span>
            {RANGE_PRESETS.map((p) => (
              <Button
                key={p.value}
                size="sm"
                variant={rangePreset === p.value ? "default" : "secondary"}
                onClick={() => {
                  setRangePreset(p.value);
                  const r = presetRange(p.value);
                  setFrom(r.from);
                  setTo(r.to);
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {rangePreset === "custom" && (
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="reports-from" className="text-sm font-medium">
                  Desde
                </Label>
                <Input
                  id="reports-from"
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    if (e.target.value > to) setTo(e.target.value);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="reports-to" className="text-sm font-medium">
                  Hasta
                </Label>
                <Input
                  id="reports-to"
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    if (e.target.value < from) setFrom(e.target.value);
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span>
              Desde{" "}
              <span className="font-semibold text-white">
                {new Date(`${from}T12:00:00`).toLocaleDateString("es-MX", {
                  dateStyle: "medium",
                })}
              </span>{" "}
              hasta{" "}
              <span className="font-semibold text-white">
                {new Date(`${to}T12:00:00`).toLocaleDateString("es-MX", {
                  dateStyle: "medium",
                })}
              </span>
            </span>
            <span className="hidden sm:inline text-slate-500">·</span>
            <span>
              {from === to
                ? "Un día específico"
                : `${Math.round(
                    (new Date(`${to}T12:00:00`).getTime() -
                      new Date(`${from}T12:00:00`).getTime()) /
                      86_400_000,
                  ) + 1} días`}
            </span>
          </div>

          {/* Controles contextuales por pestaña. */}
          {report === "sales-range" && (
            <div className="border-t pt-3">
              <Label htmlFor="reports-gran" className="text-sm font-medium">
                Agrupar por
              </Label>
              <select
                id="reports-gran"
                className="ml-3 h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                value={granularity}
                onChange={(e) => setGranularity(e.target.value as Granularity)}
              >
                <option value="day">Día</option>
                <option value="week">Semana</option>
                <option value="month">Mes</option>
              </select>
            </div>
          )}

          {report === "peak-hours" && (
            <div className="flex flex-wrap items-center gap-3 border-t pt-3">
              <Label htmlFor="reports-hour-from" className="text-sm font-medium">
                Desde hora
              </Label>
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
              <Label htmlFor="reports-hour-to" className="text-sm font-medium">
                Hasta hora
              </Label>
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
          )}

          {report === "top-products" && (
            <div className="flex items-center gap-2 border-t pt-3">
              <Button
                size="sm"
                variant={topOnly ? "default" : "outline"}
                onClick={() => setTopOnly(!topOnly)}
              >
                {topOnly ? "Top 10" : "Todos los productos"}
              </Button>
              <span className="text-xs text-muted-foreground">
                {topOnly
                  ? "Mostrando los 10 más vendidos"
                  : "Mostrando todos los productos"}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Menú desplegable por categorías. */}
      <ReportMenu group={REPORT_GROUPS} report={report} onSelect={setReport} />

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
    case "payments":
      return <PaymentsView data={data as PaymentsData} />;
    case "day-total":
      return <DayTotalView data={data as DayTotalData} />;
  }
}

function ReportMenu({
  group,
  report,
  onSelect,
}: {
  group: ReportCategory[];
  report: ReportKey;
  onSelect: (key: ReportKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = REPORT_TABS.find((t) => t.key === report);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-block">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-muted-foreground">Reportes:</span>
        <span className="font-medium">{active?.label}</span>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </Button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-lg border bg-popover p-2 shadow-md">
          {group.map((g, gi) => (
            <div key={g.key} className={gi > 0 ? "mt-2 border-t border-border pt-2" : ""}>
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {g.label}
              </p>
              {g.tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`flex w-full items-center rounded-md py-1.5 pl-5 pr-2 text-left text-sm transition-colors ${
                    report === t.key
                      ? "bg-primary text-primary-foreground"
                      : "text-slate-200 hover:bg-accent hover:text-accent-foreground"
                  }`}
                  onClick={() => {
                    onSelect(t.key);
                    setOpen(false);
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  numeric?: boolean;
  sortValue?: (row: T) => string | number;
};

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
  const [sortKey, setSortKey] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sortedRows = useMemo(() => {
    const list = rows ?? [];
    if (sortKey === null || !columns[sortKey].sortValue) return list;
    const accessor = columns[sortKey].sortValue;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * dir;
      }
      return String(av).localeCompare(String(bv), "es") * dir;
    });
  }, [rows, sortKey, sortDir, columns]);

  function toggleSort(i: number) {
    if (!columns[i].sortValue) return;
    if (sortKey === i) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(i);
      setSortDir(columns[i].numeric ? "desc" : "asc");
    }
  }

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
                <th
                  key={i}
                  onClick={() => toggleSort(i)}
                  className={`px-4 py-2 font-medium ${
                    c.sortValue ? "cursor-pointer select-none" : ""
                  } ${c.numeric ? "text-right font-mono" : ""}`}
                >
                  {c.header}
                  {sortKey === i && (
                    <span className="text-muted-foreground">
                      {sortDir === "asc" ? " ↑" : " ↓"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, ri) => (
              <tr
                key={ri}
                className="even:bg-slate-900/50 hover:bg-slate-800 transition-colors border-b last:border-b-0"
              >
                {columns.map((c, ci) => (
                  <td
                    key={ci}
                    className={`px-4 py-2 ${
                      c.numeric ? "text-right font-mono" : ""
                    }`}
                  >
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
  const payments = data.paymentsToday ?? [];
  const totalPaid = payments.reduce((acc, p) => acc + p.revenue, 0);
  const shareOf = (revenue: number) =>
    totalPaid > 0 ? Math.round((revenue / totalPaid) * 100) : 0;
  const cash = payments.find((p) => p.method === "EFECTIVO");
  const qr = payments.find((p) => p.method === "QR");
  const tarjeta = payments.find((p) => p.method === "TARJETA");
  const cashPct = shareOf(cash?.revenue ?? 0);
  const qrPct = shareOf(qr?.revenue ?? 0);
  const tarjetaPct = shareOf(tarjeta?.revenue ?? 0);

  const peakHourLabel =
    data.peakHour != null ? `${String(data.peakHour).padStart(2, "0")}:00` : "—";
  const bestCatLabel = data.bestCategory
    ? FlavorCategoryLabel[data.bestCategory] ?? data.bestCategory
    : "—";

  const staff = data.staffPerformance ?? [];

  return (
    <div className="space-y-5">
      {/* Row 1 — Core financial */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Ventas netas"
          value={formatPrice(data.netSales)}
          hint={`vs periodo anterior ${pct(data.growthPct)}`}
        />
        <KpiCard
          label="Ticket promedio"
          value={formatPrice(data.avgTicket)}
        />
        <KpiCard
          label="Ordenes procesadas"
          value={String(data.ordersVolume)}
        />
        <KpiCard
          label="Pedidos pendientes"
          value={String(data.pendingOrders)}
          hint="KDS live"
        />
      </div>

      {/* Row 2 — Operational KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Tasa anulaciones"
          value={`${data.cancelledPct}%`}
          hint={`Costo: ${formatPrice(data.cancellationsCost)}`}
        />
        <KpiCard
          label="Descuentos"
          value={formatPrice(data.discountsTotal)}
        />
        <KpiCard
          label="Entrega promedio"
          value={`${data.avgDeliveryMinutes} min`}
          hint="createdAt → deliveredAt"
        />
        <KpiCard
          label="Hora pico"
          value={peakHourLabel}
          hint="Mayor facturacion"
        />
      </div>

      {/* Row 3 — Category + Toppings + Menu */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Categoria estrella" value={bestCatLabel} />
        <KpiCard
          label="Toppings / Extras"
          value={`${data.toppingsMarginPct}%`}
          hint="Participacion sobre venta total"
        />
        <KpiCard
          label="Rotacion del menu"
          value={`${data.menuRotationPct}%`}
          hint="Catalogo sin movimiento"
        />
        <KpiCard
          label="Desc. vs ayer"
          value={pct(data.deltaPct.revenue)}
          hint="Crecimiento facturacion"
        />
      </div>

      {/* Payment method breakdown */}
      {payments.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 space-y-2">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Metodo de pago preferido
          </p>
          {payments.map((p) => {
            const pctv = shareOf(p.revenue);
            return (
              <div key={p.method} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-sm text-muted-foreground">
                  {PaymentMethodLabel[p.method] ?? p.method}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${pctv}%` }}
                  />
                </div>
                <span className="w-32 shrink-0 text-right text-sm text-white">
                  {pctv}% · {formatPrice(p.revenue)}
                </span>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground pt-1">
            Efectivo {cashPct}% · QR {qrPct}%
            {tarjetaPct > 0 ? ` · Tarjeta ${tarjetaPct}%` : ""}
          </p>
        </div>
      )}

      {/* Staff performance table */}
      {staff.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-sm font-medium text-muted-foreground mb-3">
            Rendimiento por empleado
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Empleado</th>
                  <th className="pb-2 font-medium text-right">Ordenes</th>
                  <th className="pb-2 font-medium text-right">Recaudado</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.userId} className="border-b border-slate-800/50">
                    <td className="py-2 text-white">{s.userName}</td>
                    <td className="py-2 text-right text-white">
                      {s.ordersProcessed}
                    </td>
                    <td className="py-2 text-right text-white">
                      {formatPrice(s.revenueTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
            { header: "Método de pago", cell: (r) => PaymentMethodLabel[r.method] ?? r.method, sortValue: (r) => r.method },
            { header: "Órdenes", cell: (r) => r.orders, numeric: true, sortValue: (r) => r.orders },
            { header: "Ingresos", cell: (r) => formatPrice(r.revenue), numeric: true, sortValue: (r) => r.revenue },
          ]}
          rows={data.paymentBreakdown}
          emptyText="Sin pagos registrados."
        />
      ) : null}
      <DataTable
        columns={[
          { header: "Categoría", cell: (r) => FlavorCategoryLabel[r.category], sortValue: (r) => FlavorCategoryLabel[r.category] },
          { header: "Órdenes", cell: (r) => r.orders, numeric: true, sortValue: (r) => r.orders },
          { header: "Unidades", cell: (r) => r.units, numeric: true, sortValue: (r) => r.units },
          { header: "Ingresos", cell: (r) => formatPrice(r.revenue), numeric: true, sortValue: (r) => r.revenue },
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
          { header: "Periodo", cell: (r) => r.bucket, sortValue: (r) => r.bucket },
          { header: "Órdenes", cell: (r) => r.orders, numeric: true, sortValue: (r) => r.orders },
          { header: "Ingresos", cell: (r) => formatPrice(r.revenue), numeric: true, sortValue: (r) => r.revenue },
          { header: "Ticket promedio", cell: (r) => formatPrice(r.avgTicket), numeric: true, sortValue: (r) => r.avgTicket },
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
          { header: "Hora", cell: (r) => `${String(r.hour).padStart(2, "0")}:00`, sortValue: (r) => r.hour },
          { header: "Órdenes", cell: (r) => r.orders, numeric: true, sortValue: (r) => r.orders },
          { header: "Ingresos", cell: (r) => formatPrice(r.revenue), numeric: true, sortValue: (r) => r.revenue },
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
        { header: "Categoría", cell: (r) => FlavorCategoryLabel[r.category], sortValue: (r) => FlavorCategoryLabel[r.category] },
        { header: "Unidades", cell: (r) => r.unitsSold, numeric: true, sortValue: (r) => r.unitsSold },
        { header: "Ingresos", cell: (r) => formatPrice(r.revenue), numeric: true, sortValue: (r) => r.revenue },
        { header: "Participación", cell: (r) => `${r.sharePct}%`, sortValue: (r) => r.sharePct },
        { header: "Precio promedio", cell: (r) => formatPrice(r.avgTicketItem), numeric: true, sortValue: (r) => r.avgTicketItem },
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
        { header: "#", cell: (r) => r.rank, sortValue: (r) => r.rank },
        { header: "Producto", cell: (r) => r.key, sortValue: (r) => r.key },
        { header: "Unidades", cell: (r) => r.unitsSold, numeric: true, sortValue: (r) => r.unitsSold },
        { header: "Ingresos", cell: (r) => formatPrice(r.revenue), numeric: true, sortValue: (r) => r.revenue },
        { header: "Precio promedio", cell: (r) => formatPrice(r.unitPriceAvg), numeric: true, sortValue: (r) => r.unitPriceAvg },
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
        { header: "Combinación", cell: (r) => r.key, sortValue: (r) => r.key },
        { header: "Unidades", cell: (r) => r.unitsSold, numeric: true, sortValue: (r) => r.unitsSold },
        { header: "Ingresos", cell: (r) => formatPrice(r.revenue), numeric: true, sortValue: (r) => r.revenue },
        {
          header: "Disponible",
          cell: (r) => (
            <Badge variant={r.available ? "success" : "secondary"}>
              {r.available ? "Sí" : "No"}
            </Badge>
          ),
          sortValue: (r) => (r.available ? 1 : 0),
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
        { header: "Usuario", cell: (r) => r.user.name, sortValue: (r) => r.user.name },
        { header: "Órdenes procesadas", cell: (r) => r.ordersProcessed, numeric: true, sortValue: (r) => r.ordersProcessed },
        { header: "Recaudado", cell: (r) => formatPrice(r.revenueTotal), numeric: true, sortValue: (r) => r.revenueTotal },
        { header: "Ticket promedio", cell: (r) => formatPrice(r.avgTicket), numeric: true, sortValue: (r) => r.avgTicket },
        { header: "Participación", cell: (r) => `${r.shareOfRevenuePct}%`, sortValue: (r) => r.shareOfRevenuePct },
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
            sortValue: (r) => r.type,
          },
          { header: "Pedido", cell: (r) => `#${String(r.orderSeq ?? 0).padStart(5, "0")}`, sortValue: (r) => r.orderSeq ?? 0 },
          { header: "Monto", cell: (r) => formatPrice(r.amount), numeric: true, sortValue: (r) => r.amount },
          { header: "Motivo", cell: (r) => r.reason || "—", sortValue: (r) => r.reason ?? "" },
          { header: "Responsable", cell: (r) => r.byUser?.name ?? "—", sortValue: (r) => r.byUser?.name ?? "" },
          {
            header: "Momento",
            cell: (r) =>
              new Date(r.at).toLocaleString("es-MX", {
                dateStyle: "short",
                timeStyle: "short",
              }),
            sortValue: (r) => new Date(r.at).getTime(),
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

function PaymentsView({ data }: { data: PaymentsData }) {
  const summary = data.summary ?? {
    revenueTotal: 0,
    ordersTotal: 0,
    methodsCount: 0,
  };
  const breakdown = data.breakdown ?? [];
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Ingresos del rango"
          value={formatPrice(summary.revenueTotal)}
        />
        <KpiCard label="Órdenes pagadas" value={String(summary.ordersTotal)} />
        <KpiCard label="Métodos activos" value={String(summary.methodsCount)} />
      </div>
      <DataTable
        columns={[
          {
            header: "Método de pago",
            cell: (r) => PaymentMethodLabel[r.method] ?? r.method,
            sortValue: (r) => PaymentMethodLabel[r.method] ?? r.method,
          },
          {
            header: "Órdenes",
            cell: (r) => r.orders,
            numeric: true,
            sortValue: (r) => r.orders,
          },
          {
            header: "Ingresos",
            cell: (r) => formatPrice(r.revenue),
            numeric: true,
            sortValue: (r) => r.revenue,
          },
        ]}
        rows={breakdown}
        emptyText="Sin pagos en el rango."
      />
    </div>
  );
}

function DayTotalView({ data }: { data: DayTotalData }) {
  const summary = data.summary ?? {
    ordersTotal: 0,
    revenueTotal: 0,
    discountsTotal: 0,
    netTotal: 0,
  };
  const orders = data.orders ?? [];
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Órdenes" value={String(summary.ordersTotal)} />
        <KpiCard
          label="Ingresos brutos"
          value={formatPrice(summary.revenueTotal)}
        />
        <KpiCard
          label="Descuentos"
          value={formatPrice(summary.discountsTotal)}
        />
        <KpiCard
          label="Neto cobrado"
          value={formatPrice(summary.netTotal)}
        />
      </div>
      <DataTable
        columns={[
          {
            header: "# Ticket",
            cell: (r) => `#${String(r.seq ?? 0).padStart(5, "0")}`,
            sortValue: (r) => r.seq ?? 0,
          },
          {
            header: "Fecha y hora",
            cell: (r) =>
              new Date(r.createdAt).toLocaleString("es-BO", {
                timeZone: "America/La_Paz",
                dateStyle: "short",
                timeStyle: "short",
              }),
            sortValue: (r) => new Date(r.createdAt).getTime(),
          },
          {
            header: "Cliente",
            cell: (r) => r.customerName ?? "—",
            sortValue: (r) => r.customerName ?? "",
          },
          {
            header: "Monto",
            cell: (r) => formatPrice(r.total),
            numeric: true,
            sortValue: (r) => r.total,
          },
          {
            header: "Descuento",
            cell: (r) => (r.discountAmount > 0 ? formatPrice(r.discountAmount) : "—"),
            numeric: true,
            sortValue: (r) => r.discountAmount,
          },
          {
            header: "Motivo",
            cell: (r) => r.discountReason ?? "—",
            sortValue: (r) => r.discountReason ?? "",
          },
        ]}
        rows={orders}
        emptyText="Sin ventas en el rango."
      />
    </div>
  );
}
