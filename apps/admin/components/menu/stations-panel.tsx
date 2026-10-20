"use client";

import { useEffect, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { ChefHat, Coffee, Info } from "lucide-react";
import { Badge, cn, useToast } from "@bbspos/ui";
import {
  KitchenStation,
  KitchenStationLabel,
  KitchenStationList,
  type KitchenStation as KitchenStationType,
} from "@bbspos/types";
import {
  setCategoryStation,
  type CategoryAdminView,
} from "@/app/actions/category";

/**
 * Checklist de estaciones: cada categoría de la carta se marca en Cocina o en
 * Cafetería. Esa decisión define en qué comanda se imprime cada producto.
 */
export function StationsPanel({
  categories,
}: {
  categories: CategoryAdminView[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [stations, setStations] = useState<Record<string, KitchenStationType>>(
    () => Object.fromEntries(categories.map((c) => [c.key, c.station])),
  );

  useEffect(() => {
    setStations(Object.fromEntries(categories.map((c) => [c.key, c.station])));
  }, [categories]);

  const kitchenCount = categories.filter(
    (c) => stations[c.key] === KitchenStation.COCINA,
  ).length;
  const cafeteriaCount = categories.length - kitchenCount;

  function change(key: string, station: KitchenStationType) {
    if (stations[key] === station) return;
    const previous = stations[key];
    setStations((current) => ({ ...current, [key]: station }));
    startTransition(async () => {
      try {
        await setCategoryStation({ key, station });
        router.refresh();
      } catch (e) {
        setStations((current) => ({ ...current, [key]: previous }));
        toast({
          variant: "destructive",
          title: "No se pudo cambiar la estación",
          description: e instanceof Error ? e.message : "Ocurrió un error.",
          duration: 100000,
        });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-800 bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">
              Estaciones de impresión
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Marcá en qué comanda sale cada categoría. Al aceptar un pedido se
              imprimen dos comandas separadas: una para Cocina y otra para
              Cafetería, solo si el pedido tiene productos de esa estación.
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1">
              <ChefHat className="h-3.5 w-3.5" /> {kitchenCount} cocina
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Coffee className="h-3.5 w-3.5" /> {cafeteriaCount} cafetería
            </Badge>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-md border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            Las bebidas armadas (bubble tea: con leche, con agua y especiales)
            siempre salen en la comanda de Cafetería. Los platos de una
            categoría sin marcar usan el valor por defecto: Cocina.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-800 bg-card">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Categoría</th>
              <th className="px-4 py-3 text-center font-medium">Cocina</th>
              <th className="px-4 py-3 text-center font-medium">Cafetería</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {categories.map((category) => {
              const station =
                stations[category.key] ?? KitchenStation.COCINA;
              return (
                <tr
                  key={category.key}
                  className={cn(
                    "transition-colors",
                    !category.isActive && "opacity-60",
                  )}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium text-white">
                        {category.name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {category.key}
                      </span>
                      {!category.isActive && (
                        <Badge variant="outline">Inactiva</Badge>
                      )}
                    </div>
                  </td>
                  {KitchenStationList.map((option) => (
                    <td key={option} className="px-4 py-2.5 text-center">
                      <label
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm",
                          station === option
                            ? "text-white"
                            : "text-slate-500 hover:text-slate-300",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-orange-500"
                          checked={station === option}
                          disabled={pending}
                          onChange={() => change(category.key, option)}
                          aria-label={`${category.name}: ${KitchenStationLabel[option]}`}
                        />
                        {option === KitchenStation.COCINA ? (
                          <ChefHat className="h-3.5 w-3.5" />
                        ) : (
                          <Coffee className="h-3.5 w-3.5" />
                        )}
                      </label>
                    </td>
                  ))}
                </tr>
              );
            })}
            {categories.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  No hay categorías registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
