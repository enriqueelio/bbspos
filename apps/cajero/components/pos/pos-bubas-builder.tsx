"use client";

import {
  FlavorCategoryLabel,
  FlavorCategoryList,
  formatPrice,
  type BobaType,
  type Flavor,
  type FlavorCategory as FlavorCategoryType,
  type Size,
  type Topping,
} from "@bbspos/types";
import { CHIP, CHIP_BASE, PRODUCT, PRODUCT_BASE, TOP_LABEL } from "./pos-styles";

export function PosBubasBuilder({
  bubaCategory,
  onSwitchCategory,
  flavors,
  allFlavors,
  sizes,
  bobaTypes,
  toppings,
  selectedFlavorId,
  selectedFlavor,
  selectedSize,
  selectedBobaType,
  selectedToppings,
  productQty,
  productBlockReason,
  preticketSubtotal,
  canConfirm,
  onSelectFlavor,
  onSelectSize,
  onSelectBoba,
  onSetToppingQty,
  onConfirmProduct,
}: {
  bubaCategory: FlavorCategoryType;
  onSwitchCategory: (category: FlavorCategoryType) => void;
  flavors: Flavor[];
  allFlavors: Flavor[];
  sizes: Size[];
  bobaTypes: BobaType[];
  toppings: Topping[];
  selectedFlavorId: string | null;
  selectedFlavor: Flavor | null;
  selectedSize: Size | undefined;
  selectedBobaType: BobaType | undefined;
  selectedToppings: { id: string; name: string; price: number; qty: number }[];
  productQty: number;
  productBlockReason: string | null;
  preticketSubtotal: number | null;
  canConfirm: boolean;
  onSelectFlavor: (flavor: Flavor) => void;
  onSelectSize: (id: string) => void;
  onSelectBoba: (id: string) => void;
  onSetToppingQty: (toppingId: string, qty: number) => void;
  onConfirmProduct: () => void;
}) {
  // Encontrar toppings de boba (Tapioca y Explosivas)
  const bobaToppings = toppings.filter((t) => {
    const name = t.name.toLowerCase();
    return name.includes("tapioca") || name.includes("explosiva");
  });

  // Obtener cantidad actual de un topping
  const getToppingQty = (toppingId: string) =>
    selectedToppings.find((tp) => tp.id === toppingId)?.qty ?? 0;

  return (
    <>
      {/* Subcategorías de Bubble Drinks (Especiales / Con agua / Con leche) */}
      <div className="flex flex-wrap gap-2">
        {FlavorCategoryList.map((category) => {
          const enabled = allFlavors.some((f) =>
            f.categories.includes(category),
          );
          const selected = category === bubaCategory;
          return (
            <button
              key={category}
              type="button"
              disabled={!enabled}
              onClick={() => onSwitchCategory(category)}
              className={`${CHIP_BASE} ${
                selected ? CHIP.selected : CHIP.idle
              }`}
            >
              {FlavorCategoryLabel[category]}
            </button>
          );
        })}
      </div>

      {/* Grilla de sabores: misma retícula de 5 columnas que la barra de
          categorías y los almuerzos del día, para que las columnas alineen. */}
      <div className="grid grid-cols-5 gap-2">
        {flavors.map((flavor) => {
          const selected = selectedFlavorId === flavor.id;
          return (
            <button
              key={flavor.id}
              type="button"
              onClick={() => onSelectFlavor(flavor)}
              className={`${PRODUCT_BASE} h-12 ${
                selected ? PRODUCT.selected : PRODUCT.idle
              }`}
            >
              {flavor.name}
            </button>
          );
        })}
      </div>

      {/* Tamaño */}
      <section className="mt-2 space-y-3">
        <h3 className={TOP_LABEL}>Tamaño</h3>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {sizes.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectSize(s.id)}
              className={`${PRODUCT_BASE} h-12 ${
                s.id === selectedSize?.id ? PRODUCT.selected : PRODUCT.idle
              }`}
            >
              {s.name} · {s.oz} oz
            </button>
          ))}
        </div>
      </section>

      {/* Tipo de boba (debajo de tamaño) - selección radio */}
      <section className="mt-2 space-y-3">
        <h3 className={TOP_LABEL}>Tipo de boba</h3>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {bobaTypes.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => onSelectBoba(b.id)}
              className={`${PRODUCT_BASE} h-12 ${
                b.id === selectedBobaType?.id ? PRODUCT.selected : PRODUCT.idle
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      </section>

      {/* Extras: Tapioca extra y Explosiva extra con controles +/- */}
      {bobaToppings.length > 0 && (
        <section className="mt-2 space-y-3">
          <h3 className={TOP_LABEL}>Extras</h3>
          <div className="flex flex-wrap gap-2">
            {bobaToppings.map((t) => {
              const qty = getToppingQty(t.id);
              return (
                <div key={t.id} className="flex items-center gap-1 whitespace-nowrap">
                  <button
                    type="button"
                    disabled={qty <= 0}
                    onClick={() => onSetToppingQty(t.id, qty - 1)}
                    className="h-8 w-8 rounded-lg bg-slate-700 text-white text-lg font-bold flex items-center justify-center active:scale-90 transition-all hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-30 shrink-0"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-white shrink-0">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSetToppingQty(t.id, qty + 1)}
                    className="h-8 w-8 rounded-lg bg-slate-700 text-white text-lg font-bold flex items-center justify-center active:scale-90 transition-all hover:bg-slate-600 shrink-0"
                  >
                    +
                  </button>
                  <span className="px-2 text-xs text-slate-300 whitespace-nowrap shrink-0">
                    {t.name} · {formatPrice(t.price)}
                  </span>
                </div>
              );
            })}
            {/* Otros toppings no-boba */}
            {toppings
              .filter((t) => {
                const name = t.name.toLowerCase();
                return !name.includes("tapioca") && !name.includes("explosiva");
              })
              .map((t) => {
                const qty = getToppingQty(t.id);
                return (
                  <div key={t.id} className="flex items-center gap-1 whitespace-nowrap">
                    <button
                      type="button"
                      disabled={qty <= 0}
                      onClick={() => onSetToppingQty(t.id, qty - 1)}
                      className="h-8 w-8 rounded-lg bg-slate-700 text-white text-lg font-bold flex items-center justify-center active:scale-90 transition-all hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-30 shrink-0"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-white shrink-0">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSetToppingQty(t.id, qty + 1)}
                      className="h-8 w-8 rounded-lg bg-slate-700 text-white text-lg font-bold flex items-center justify-center active:scale-90 transition-all hover:bg-slate-600 shrink-0"
                    >
                      +
                    </button>
                    <span className="px-2 text-xs text-slate-300 whitespace-nowrap shrink-0">
                      {t.name} · {formatPrice(t.price)}
                    </span>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* Preticket: producto en construcción - SIN control de cantidad */}
      {selectedFlavor ? (
        <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white">
            Producto en curso
          </h3>
          <div className="mt-2 space-y-1 text-sm text-white">
            <p className="font-semibold capitalize">{selectedFlavor.name}</p>
            <p className="text-slate-400">
              {selectedSize?.name
                ? `${selectedSize.name} · ${selectedBobaType?.name ?? ""}`
                : "Elige un tamaño"}
            </p>
            {selectedToppings.length > 0 && (
              <p className="text-slate-400">
                + {selectedToppings.map((t) => `${t.name} × ${t.qty}`).join(", ")}
              </p>
            )}
            {productBlockReason && (
              <p className="text-xs font-semibold text-amber-300">
                ⚠ {productBlockReason}
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={onConfirmProduct}
            className="mt-3 h-11 w-full rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 text-base font-bold text-white shadow-lg shadow-emerald-950/40 transition-all active:scale-[0.99] hover:from-emerald-400 hover:to-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <span>Confirmar</span>
            {preticketSubtotal !== null && (
              <span className="font-bold text-base text-white">
                {formatPrice(preticketSubtotal * productQty)}
              </span>
            )}
          </button>
        </section>
      ) : (
        <p className="text-sm text-slate-500">
          Toca un sabor para empezar tu pedido.
        </p>
      )}
    </>
  );
}