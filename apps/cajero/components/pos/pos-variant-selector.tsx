"use client";

import { useEffect, useRef } from "react";
import { formatPrice, type MenuItemView } from "@bbspos/types";

// ===== Alitas: sabores simples y salsas de las alitas mixtas =====
// Las alitas simples vienen bañadas en su salsa; las Alitas Mixtas obligan a
// elegir salsas. Todo sale de la BD: isMixtas/requiredSauces del plato y el
// catálogo de salsas de /api/alita-sauces (nada hardcodeado).

/** Salsas exigidas si ni el plato ni el tamaño definen cuántas elegir. */
const FALLBACK_REQUIRED_SAUCES = 2;

export function isMixtasItem(item: MenuItemView): boolean {
  return item.isMixtas === true;
}

/** Salsas a elegir: manda la del tamaño; si no, la del plato; si no, fallback. */
export function getRequiredSauces(
  item: MenuItemView,
  option: MenuItemView["options"][number],
): number {
  return (
    option.requiredSauces ?? item.requiredSauces ?? FALLBACK_REQUIRED_SAUCES
  );
}

/** Ordenamiento de los tamaños por el número inicial ("6 u", "8 u", "12 u"). */
function sortByQuantity(a: MenuItemView["options"][number], b: MenuItemView["options"][number]) {
  return (
    Number(a.name.match(/^(\d+)/)?.[1] ?? 0) -
    Number(b.name.match(/^(\d+)/)?.[1] ?? 0)
  );
}

export function PosVariantSelector({
  item,
  selectedSize,
  selectedSauces,
  alitaSauces,
  onSelectSize,
  onToggleSauce,
  onConfirm,
  onCancel,
}: {
  item: MenuItemView;
  selectedSize: MenuItemView["options"][number] | null;
  selectedSauces: string[];
  alitaSauces: string[];
  onSelectSize: (option: MenuItemView["options"][number]) => void;
  onToggleSauce: (sauce: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Al abrirse (o cambiar de plato) el panel se lleva al centro de la vista
  // para que el cajero no pierda el selector si tocó un plato al final de la
  // grilla.
  useEffect(() => {
    panelRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [item]);

  return (
    <div
      ref={panelRef}
      className="scroll-mt-20 rounded-xl border border-primary/40 bg-slate-900/80 p-4 space-y-3 shadow-lg shadow-black/20"
    >
      <p className="text-sm font-bold text-white capitalize">
        {item.name} — elige tamaño
      </p>
      <div className="grid grid-cols-2 gap-2">
        {[...item.options].sort(sortByQuantity).map((option) => {
          const active = selectedSize?.id === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectSize(option)}
              className={`h-12 rounded-xl border text-sm font-semibold text-white transition-all active:scale-95 ${
                active
                  ? "border-primary bg-primary"
                  : "border-slate-600 bg-slate-800 hover:border-primary hover:bg-slate-700"
              }`}
            >
              <span className="block capitalize">{option.name}</span>
              <span className="block text-xs font-semibold text-slate-300">
                {formatPrice(option.price)}
              </span>
            </button>
          );
        })}
      </div>

      {isMixtasItem(item) && selectedSize && (
        <div className="rounded-lg bg-slate-950/60 p-3 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-white">
            Salsas a elección
          </p>
          <p className="text-xs text-slate-400">
            Marca{" "}
            <span className="font-bold text-amber-300">
              {getRequiredSauces(item, selectedSize)}
            </span>{" "}
            salsas ({selectedSauces.length}/{getRequiredSauces(item, selectedSize)})
          </p>
          <div className="flex flex-wrap gap-2">
            {alitaSauces.map((sauce) => {
              const on = selectedSauces.includes(sauce);
              return (
                <button
                  key={sauce}
                  type="button"
                  onClick={() => onToggleSauce(sauce)}
                  className={`h-9 rounded-full border px-3 text-xs font-semibold transition-all active:scale-95 ${
                    on
                      ? "border-amber-400 bg-amber-400/20 text-amber-100"
                      : "border-slate-600 bg-slate-800 text-slate-300 hover:border-amber-400/60"
                  }`}
                >
                  {sauce}
                </button>
              );
            })}
          </div>
          {selectedSauces.length === getRequiredSauces(item, selectedSize) && (
            <button
              type="button"
              onClick={onConfirm}
              className="mt-2 h-11 w-full rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 text-base font-bold text-white shadow-lg shadow-emerald-950/40 transition-all active:scale-[0.99] hover:from-emerald-400 hover:to-emerald-600"
            >
              Confirmar · {formatPrice(selectedSize.price)}
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onCancel}
        className="w-full rounded-lg pt-1 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide transition-colors hover:text-white"
      >
        Cancelar
      </button>
    </div>
  );
}