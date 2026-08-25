"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  FlavorPicker,
  StepIndicator,
} from "@bubba/ui";
import { Droplets, Milk, Sparkles } from "lucide-react";
import {
  FlavorCategory,
  FlavorCategoryLabel,
  FlavorCategoryList,
  computeBasePrice,
  formatPrice,
  sumToppings,
} from "@bubba/types";
import type { Catalog } from "@/lib/catalog";
import { useBuilderStore } from "@/lib/store/builder-store";
import { useCartStore } from "@/lib/store/cart-store";
import { cn } from "@bubba/ui";

const STEPS = ["Categoría y sabor", "Tamaño y boba", "Toppings"];

const CATEGORY_ICONS: Record<FlavorCategory, React.ReactNode> = {
  WATER: <Droplets className="h-5 w-5" />,
  MILK: <Milk className="h-5 w-5" />,
  SPECIAL: <Sparkles className="h-5 w-5" />,
};

export function BuildClient({ catalog }: { catalog: Catalog }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const {
    category,
    flavorId,
    sizeId,
    bobaTypeId,
    toppingIds,
    setCategory,
    setFlavor,
    setSize,
    setBobaType,
    toggleTopping,
    clearToppings,
    reset,
  } = useBuilderStore();
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    reset();
  }, []);

  const size = catalog.sizes.find((s) => s.id === sizeId);
  const flavor = catalog.flavors.find((f) => f.id === flavorId);
  const boba = catalog.bobaTypes.find((b) => b.id === bobaTypeId);

  const stepComplete = [
    category !== null && Boolean(flavor),
    Boolean(size) && Boolean(boba),
    true,
  ][step];

  const basePrice =
    category && size && boba
      ? computeBasePrice(catalog.drinkPrices, category, size.id, boba.id)
      : null;

  const selectedToppings = catalog.toppings.filter((t) =>
    toppingIds.includes(t.id),
  );
  const price =
    basePrice !== null ? basePrice + sumToppings(selectedToppings) : null;

  const canGoNext = stepComplete && step < STEPS.length - 1;
  const canFinish = stepComplete && step === STEPS.length - 1;

  function handleAddToCart() {
    if (!size || !flavor || !boba || !category || basePrice === null) return;
    addItem({
      size,
      flavor,
      category,
      bobaType: boba,
      unitPrice: basePrice,
      toppings: selectedToppings,
    });
    reset();
    router.push("/cart");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Arma tu bubble drink</h1>
          <p className="text-white/80">
            Sigue los pasos para personalizar tu bebida.
          </p>
        </div>
        <StepIndicator steps={STEPS} current={step} />
      </div>

      <Card>
        <CardContent className="p-6">
          {step === 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold">Elige la categoría de tu bebida</h2>
              <div className="flex flex-col gap-3">
                {FlavorCategoryList.map((cat: FlavorCategory) => {
                  const expanded = expandedCategory === cat;
                  return (
                    <div key={cat} className="space-y-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (expanded) {
                            setExpandedCategory(null);
                          } else {
                            setExpandedCategory(cat);
                            setCategory(cat);
                          }
                        }}
                        className={cn(
                          "w-full rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          expanded
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border",
                        )}
                      >
                        <span className="flex items-center gap-2 font-semibold">
                          {FlavorCategoryLabel[cat]}
                          {CATEGORY_ICONS[cat]}
                        </span>
                      </button>

                      {expanded && (
                        <div className="pl-4">
                          <FlavorPicker
                            flavors={catalog.flavors}
                            category={cat}
                            selectedId={flavorId ?? undefined}
                            onSelect={setFlavor}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 1 && category && (
            <div className="space-y-3">
              <h2 className="font-semibold">Elige tamaño y tipo de boba</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {catalog.sizes.map((s) =>
                  catalog.bobaTypes.map((b) => {
                    const cellPrice = computeBasePrice(
                      catalog.drinkPrices,
                      category,
                      s.id,
                      b.id,
                    );
                    const selected = s.id === sizeId && b.id === bobaTypeId;
                    return (
                      <button
                        key={`${s.id}-${b.id}`}
                        type="button"
                        onClick={() => {
                          setSize(s.id);
                          setBobaType(b.id);
                        }}
                        disabled={cellPrice === null}
                        className={cn(
                          "rounded-xl border p-4 text-left transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-semibold">{s.name}</div>
                            <div className={cn(
                              "text-sm",
                              selected ? "text-primary-foreground/70" : "text-muted-foreground",
                            )}>
                              {b.name}
                            </div>
                          </div>
                          <span className={cn(
                            "text-lg font-bold",
                            selected ? "text-primary-foreground" : "text-primary",
                          )}>
                            {cellPrice !== null
                              ? formatPrice(cellPrice)
                              : "—"}
                          </span>
                        </div>
                      </button>
                    );
                  }),
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h2 className="font-semibold">Toppings opcionales</h2>
              {catalog.toppings.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay toppings disponibles.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {catalog.toppings.map((t) => {
                    const selected = toppingIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTopping(t.id)}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card",
                        )}
                      >
                        <span className="font-medium">{t.name}</span>
                        <span className={cn(
                          "text-sm font-semibold",
                          selected ? "text-primary-foreground" : "text-primary",
                        )}>
                          +{formatPrice(t.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col items-end gap-4 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-sm text-white/70">Total estimado</div>
            <div className="text-2xl font-bold text-white">
              {price !== null ? formatPrice(price) : "—"}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            className="bg-purple-200 text-purple-900 hover:bg-purple-300"
            disabled={step === 0}
            onClick={() => {
              if (step === 2) {
                clearToppings();
              }
              if (step === 1) {
                setSize(null);
                setBobaType(null);
              }
              setStep((s) => Math.max(0, s - 1));
            }}
          >
            Atrás
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              className={cn(
                "bg-green-200 text-green-900 hover:bg-green-300",
                flavorId && "ring-2 ring-white/50 shadow-lg shadow-white/20",
              )}
              disabled={!canGoNext}
              onClick={() => setStep((s) => s + 1)}
            >
              Siguiente
            </Button>
          ) : (
            <Button
              className={cn(
                "bg-green-200 text-green-900 hover:bg-green-300",
                "ring-2 ring-white/50 shadow-lg shadow-white/20",
              )}
              disabled={!canFinish}
              onClick={handleAddToCart}
            >
              Agregar al carrito
            </Button>
          )}
        </div>
      </div>

    </div>
  );
}
