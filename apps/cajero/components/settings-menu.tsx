"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Loader2,
  Printer,
  Settings2,
} from "lucide-react";
import { formatOrderCode } from "@bbspos/types";
import { reprintOrder } from "@/app/actions/printing";

export type ReprintOrderOption = {
  id: string;
  seq: number | null;
  customerName: string | null;
  createdAt: string;
};

/** Rueda dentada (esquina superior derecha) con el menú de navegación:
 *  Ventas · Reportes · Reimpresión de comandas. */
export function SettingsMenu({
  printableOrders,
}: {
  printableOrders: ReprintOrderOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState<"main" | "reprint">("main");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Cierre por clic fuera (botón o menú) y navegación con Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSub("main");
        setMsg(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (sub === "reprint") {
        setSub("main");
        setMsg(null);
      } else {
        setOpen(false);
        setMsg(null);
      }
    }
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, sub]);

  async function handleReprint(orderId: string) {
    if (busyId) return;
    setBusyId(orderId);
    setMsg(null);
    try {
      const text = await reprintOrder(orderId);
      setMsg({ ok: true, text });
    } catch (e) {
      setMsg({
        ok: false,
        text: e instanceof Error ? e.message : "No se pudo reimprimir.",
      });
    } finally {
      setBusyId(null);
    }
  }

  function go(href: string) {
    setOpen(false);
    setSub("main");
    setMsg(null);
    router.push(href);
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-label="Menú de opciones"
        title="Menú de opciones"
        onClick={() => {
          setOpen((v) => !v);
          setSub("main");
          setMsg(null);
        }}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700"
      >
        <Settings2 className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
          {sub === "reprint" ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setSub("main")}
                  className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 transition-colors hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" /> Volver
                </button>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Reimpresión
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto py-1">
                {printableOrders.length === 0 && (
                  <p className="px-3 py-3 text-xs text-slate-500">
                    No hay pedidos por reimprimir.
                  </p>
                )}
                {printableOrders.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-800"
                  >
                    <span className="shrink-0 text-xs font-black text-white">
                      #{formatOrderCode(o.seq)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-primary">
                      {o.customerName ?? "Sin nombre"}
                    </span>
                    <span className="shrink-0 text-[10px] tabular-nums text-slate-400">
                      {hora24h(o.createdAt)}
                    </span>
                    <button
                      type="button"
                      disabled={busyId === o.id}
                      title="Reimprimir comanda"
                      onClick={() => handleReprint(o.id)}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-slate-300 transition-colors hover:border-primary hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busyId === o.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Printer className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => go("/?tab=venta")}
                className="flex w-full items-center gap-2 border-b border-slate-800 px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition-colors hover:bg-slate-800"
              >
                Ventas
              </button>
              <button
                type="button"
                onClick={() => go("/?tab=reporte")}
                className="flex w-full items-center gap-2 border-b border-slate-800 px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition-colors hover:bg-slate-800"
              >
                Reportes
              </button>
              <button
                type="button"
                onClick={() => {
                  setSub("reprint");
                  setMsg(null);
                }}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition-colors hover:bg-slate-800"
              >
                Reimpresión
              </button>
            </>
          )}

          {msg && (
            <p
              className={`border-t border-slate-800 px-3 py-2 text-xs font-semibold ${
                msg.ok ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {msg.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function hora24h(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}