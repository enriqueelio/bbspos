"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  FlavorPicker,
  StepIndicator,
} from "@bubba/ui";
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

export function BuildClient({ catalog }: { catalog: Catalog }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
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
    reset,
  } = useBuilderStore();
  const addItem = useCartStore((s) => s.addItem);

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
          <h1 className="text-2xl font-bold">Arma tu bubble drink</h1>
          <p className="text-muted-foreground">
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
                  const selected = category === cat;
                  return (
                    <div key={cat} className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={cn(
                          "w-full rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selected && "border-primary ring-2 ring-primary/30",
                        )}
                      >
                        <span className="font-semibold">
                          {FlavorCategoryLabel[cat]}
                        </span>
                      </button>

                      {selected && (
                        <div className="pl-4">
                          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Elige tu sabor</h3>
                          <FlavorPicker
                            flavors={catalog.flavors}
                            category={category}
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
                          "rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                          selected && "border-primary ring-2 ring-primary/30",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-semibold">{s.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {b.name}
                            </div>
                          </div>
                          <span className="text-lg font-bold text-primary">
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
                          "flex items-center justify-between gap-2 rounded-xl border bg-card px-4 py-3 text-left transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selected && "border-primary ring-2 ring-primary/30",
                        )}
                      >
                        <span className="font-medium">{t.name}</span>
                        <span className="text-sm font-semibold text-primary">
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-sm text-muted-foreground">Total estimado</div>
            <div className="text-2xl font-bold">
              {price !== null ? formatPrice(price) : "—"}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Atrás
          </Button>
          {step < STEPS.length - 1 ? (
            <Button disabled={!canGoNext} onClick={() => setStep((s) => s + 1)}>
              Siguiente
            </Button>
          ) : (
            <Button disabled={!canFinish} onClick={handleAddToCart}>
              Agregar al carrito
            </Button>
          )}
        </div>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        ¿Ya tienes todo listo?{" "}
        <Link
          href="/cart"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Ir a mi carrito
        </Link>
      </div>
    </div>
  );
}
