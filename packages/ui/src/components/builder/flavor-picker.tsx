import type { Flavor, FlavorCategory } from "@bubba/types";
import { FlavorCategoryLabel } from "@bubba/types";
import { cn } from "../../lib/utils";
import { Icon } from "@iconify/react";

const FLAVOR_ICONS: Record<string, string> = {
  "capuchino": "mdi:coffee",
  "oreo": "twemoji:cookie",
  "fruticoco": "twemoji:strawberry",
  "matcha": "mdi:tea",
  "piña colada": "twemoji:tropical-drink",
  "limonada brasilera": "twemoji:lemon",
  "frutilimon": "twemoji:strawberry",
  "taro": "twemoji:bubble-tea",
  "frutilla": "twemoji:strawberry",
  "limón": "twemoji:lemon",
  "piña": "twemoji:pineapple",
  "manzana": "mdi:food-apple",
  "naranja": "twemoji:tangerine",
  "mango": "twemoji:mango",
  "coco": "twemoji:coconut",
  "vainilla": "twemoji:blossom",
  "chocolate": "twemoji:chocolate-bar",
  "mora": "twemoji:blueberries",
};

function getFlavorIcon(name: string): React.ReactNode {
  const icon = FLAVOR_ICONS[name.toLowerCase()];
  if (!icon) return <Icon icon="mdi:food" className="h-4 w-4" />;
  return <Icon icon={icon} className="h-4 w-4" />;
}

export interface FlavorPickerProps {
  flavors: Flavor[];
  category: FlavorCategory;
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function FlavorPicker({
  flavors,
  category,
  selectedId,
  onSelect,
}: FlavorPickerProps) {
  const categoryFlavors = flavors.filter((f) =>
    f.categories.includes(category),
  );

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {FlavorCategoryLabel[category]}
      </h3>
      {categoryFlavors.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay sabores disponibles en esta categoría.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-3">
          {categoryFlavors.map((flavor) => {
            const selected = flavor.id === selectedId;
            return (
              <button
                key={flavor.id}
                type="button"
                onClick={() => onSelect(flavor.id)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card",
                )}
              >
                <span className="flex items-center justify-between font-medium">
                  {flavor.name}
                  {getFlavorIcon(flavor.name)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
