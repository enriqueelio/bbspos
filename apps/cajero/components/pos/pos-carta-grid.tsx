"use client";

import { formatPrice, type MenuItemView } from "@bbspos/types";
import { PosVariantSelector } from "./pos-variant-selector";

export function PosCartaGrid({
  paneTitle,
  items,
  variantItem,
  variantSize,
  variantSauces,
  alitaSauces,
  onTapItem,
  onSelectVariantSize,
  onToggleVariantSauce,
  onConfirmMixtas,
  onCancelVariant,
}: {
  paneTitle: string;
  items: MenuItemView[];
  variantItem: MenuItemView | null;
  variantSize: MenuItemView["options"][number] | null;
  variantSauces: string[];
  alitaSauces: string[];
  onTapItem: (item: MenuItemView) => void;
  onSelectVariantSize: (option: MenuItemView["options"][number]) => void;
  onToggleVariantSauce: (sauce: string) => void;
  onConfirmMixtas: () => void;
  onCancelVariant: () => void;
}) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-white">
        {paneTitle}
      </h3>

      {/* Grilla de platos de la categoría seleccionada (CSS Grid táctil:
          tarjetas ~140px, altura fija 70px, precio en la esquina inferior) */}
      <div className="grid grid-cols-5 gap-2">
        {items.map((item) => {
          const selected = variantItem?.id === item.id;
          return (
            <button
              key={item.id}
              type="button"
              title={item.description ?? `Agregar ${item.name}`}
              onClick={() => onTapItem(item)}
              className={`flex h-[70px] flex-col justify-between rounded-xl border p-2.5 text-left transition-transform active:scale-95 ${
                selected
                  ? "border-primary bg-primary/15"
                  : "border-slate-700/60 bg-slate-800 hover:bg-slate-700"
              }`}
            >
              <span className="line-clamp-2 text-xs font-semibold leading-tight text-white">
                {item.name}
              </span>
              {item.options.length > 0 ? (
                <span className="self-end text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                  Elegir variante
                </span>
              ) : (
                <span className="self-end font-mono text-sm font-bold text-emerald-400">
                  {formatPrice(item.price)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selector de variante (Pollo/Res, Unidades de alitas): se abre al tocar
          un plato con opciones. Las Alitas Mixtas exigen elegir el tamaño y
          luego marcar las salsas correspondientes. */}
      {variantItem && (
        <PosVariantSelector
          item={variantItem}
          selectedSize={variantSize}
          selectedSauces={variantSauces}
          alitaSauces={alitaSauces}
          onSelectSize={onSelectVariantSize}
          onToggleSauce={onToggleVariantSauce}
          onConfirm={onConfirmMixtas}
          onCancel={onCancelVariant}
        />
      )}
    </section>
  );
}