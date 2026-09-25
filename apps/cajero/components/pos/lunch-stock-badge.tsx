"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { LunchStockState } from "@bbspos/types";
import { adjustLunchStock } from "@/actions/lunch-stock";

/** Estilo del número, calcado del badge de atajos de la barra de categorías
 *  (pos-category-bar.tsx) para que el contador se lea como parte del mismo
 *  sistema visual del POS. */
const BADGE_BASE =
  "flex h-5 min-w-[22px] items-center justify-center rounded-full border px-1 font-mono text-[10px] leading-none transition-colors";

/** Los cuatro estados del contador:
 *  sin cantidad -> guion neutro · normal -> número neutro · pocas -> rojo fijo
 *  agotado -> número real en gris (la tarjeta la marca AGOTADO). Cuando lo que
 *  queda ya está apartado en el ticket de esta caja el número sigue en su color
 *  normal: no se agotó, simplemente el cajero ya lo tiene todo (la tarjeta lo
 *  marca EN TU TICKET). */
function badgeTone(state: LunchStockState): { tone: string; label: string } {
  const { remaining, planned, lowThreshold, heldByMe } = state;
  if (planned == null || remaining == null) {
    return {
      tone: "border-amber-300/30 bg-transparent text-amber-200/60",
      label: "Sin cantidad: sumale unidades para empezar",
    };
  }
  if (remaining <= 0) {
    return {
      tone: "border-slate-500/60 bg-slate-700/70 text-slate-300",
      label: "Agotado: sumale unidades para volver a venderlo",
    };
  }
  if (remaining - heldByMe <= 0) {
    return {
      tone: "border-amber-300/40 bg-amber-500/20 text-amber-100",
      label: `Las ${remaining} que quedan ya están en tu ticket`,
    };
  }
  if (remaining <= lowThreshold) {
    return {
      tone: "border-red-400/70 bg-red-500/25 text-red-200",
      label: `Pocas unidades: ${remaining}`,
    };
  }
  return {
    tone: "border-amber-300/40 bg-amber-500/20 text-amber-100",
    label: `Quedan ${remaining}`,
  };
}

/** Pasos rápidos: restar y sumar. */
const STEPS = [-10, -5, -1, 1, 5, 10] as const;

/** Medidas del panel (w-72), usadas para decidir hacia dónde abrirlo para que
 *  nunca quede metido detrás del ticket ni saliéndose del catálogo. */
const PANEL_W = 288;
const PANEL_H = 150;

const INPUT =
  "h-8 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100 outline-none focus:border-amber-400";

/** Contador de unidades de un almuerzo del día con un panel para sumar o restar.
 *
 *  El panel solo corrige la cantidad: nunca agrega unidades al ticket. El número
 *  es siempre clicable, incluso con la tarjeta agotada, porque es la única vía
 *  para reponer y rehabilitarla. */
export function LunchStockBadge({
  menuItemId,
  state,
  boundaryRef,
  onApplied,
}: {
  menuItemId: string;
  state: LunchStockState;
  /** Columna del catálogo: recorta el panel, así que decide hacia dónde abrir. */
  boundaryRef: RefObject<HTMLElement | null>;
  onApplied: (next: LunchStockState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [place, setPlace] = useState<{ align: "left" | "right"; drop: "up" | "down" }>({
    align: "right",
    drop: "down",
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Cierre con clic fuera o tecla Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function togglePanel() {
    setOpen((v) => {
      if (!v) {
        const w = wrapRef.current?.getBoundingClientRect();
        const b = boundaryRef.current?.getBoundingClientRect();
        if (w && b) {
          // Abrir a la izquierda se sale del catálogo (y queda tapado por el
          // ticket) cuando no hay espacio; en ese caso se abre a la derecha.
          setPlace({
            align: w.right - PANEL_W >= b.left + 8 ? "right" : "left",
            // Igual en vertical: si no cabe abajo, se abre hacia arriba.
            drop: b.bottom - w.bottom >= PANEL_H + 8 ? "down" : "up",
          });
        }
      }
      return !v;
    });
  }

  async function apply(delta: number) {
    if (!Number.isInteger(delta) || delta === 0) {
      setError("Escribe cuántas unidades, un número que no sea cero.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onApplied(await adjustLunchStock(menuItemId, delta));
      setAmount("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el cambio.");
    } finally {
      setBusy(false);
    }
  }

  function applyTyped(sign: 1 | -1) {
    if (amount.trim() === "") {
      setError("Escribe cuántas unidades.");
      return;
    }
    void apply(sign * Math.abs(Number(amount)));
  }

  const sinCantidad = state.planned == null || state.remaining == null;
  const agotado = state.remaining !== null && state.remaining <= 0;
  const { tone, label } = badgeTone(state);
  const number = state.remaining === null ? "—" : String(state.remaining);

  return (
    <div className="relative" ref={wrapRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        title={`${label}`}
        aria-label={label}
        aria-expanded={open}
        onClick={togglePanel}
        className={`${BADGE_BASE} ${tone} hover:brightness-125`}
      >
        {number}
      </button>

      {open && (
        <div
          ref={panelRef}
          className={`absolute z-30 w-72 rounded-xl border border-slate-700 bg-slate-900 p-3 text-left shadow-2xl shadow-black/60 ${
            place.align === "left" ? "left-0" : "right-0"
          } ${place.drop === "up" ? "bottom-full mb-1" : "top-full mt-1"}`}
        >
          <p className="mb-2 text-[11px] leading-tight text-slate-300">
            {sinCantidad
              ? "Sin cantidad. Suma unidades para poder venderlo."
              : agotado
                ? "Agotado. Suma unidades para volver a venderlo."
                : "Suma o resta unidades de la cantidad de hoy."}
          </p>

          <div className="grid grid-cols-6 gap-1">
            {STEPS.map((step) => (
              <button
                key={step}
                type="button"
                disabled={busy}
                onClick={() => void apply(step)}
                className={`h-8 rounded-lg border font-mono text-[11px] font-bold transition-colors disabled:opacity-40 ${
                  step > 0
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
                    : "border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {step > 0 ? `+${step}` : step}
              </button>
            ))}
          </div>

          <div className="mt-2 flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              max={999}
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Unidades"
              className={INPUT}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => applyTyped(-1)}
              className="h-8 shrink-0 rounded-lg border border-slate-600 bg-slate-800 px-2.5 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-40"
            >
              −
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => applyTyped(1)}
              className="h-8 shrink-0 rounded-lg bg-emerald-500 px-2.5 text-xs font-bold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-40"
            >
              +
            </button>
          </div>

          {error && (
            <p className="mt-2 text-[11px] leading-tight text-red-300">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
