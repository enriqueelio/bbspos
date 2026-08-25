import type { Flavor, FlavorCategory } from "@bubba/types";
import { FlavorCategoryLabel } from "@bubba/types";
import { cn } from "../../lib/utils";
import { Icon } from "lucide-react";
import { strawberry, coconut, lemon, coffeeBean, flowerLotus } from "@lucide/lab";
import { Cherry, Citrus, Cookie, Leaf } from "lucide-react";

const FLAVOR_ICONS: Record<string, { icon: any; library: "lab" | "lucide" }> = {
  "capuchino": { icon: coffeeBean, library: "lab" },
  "oreo": { icon: Cookie, library: "lucide" },
  "fruticoco": { icon: strawberry, library: "lab" },
  "matcha": { icon: Leaf, library: "lucide" },
  "piña colada": { icon: Citrus, library: "lucide" },
  "limonada brasilera": { icon: lemon, library: "lab" },
  "frutilimon": { icon: strawberry, library: "lab" },
  "taro": { icon: flowerLotus, library: "lab" },
  "frutilla": { icon: strawberry, library: "lab" },
  "limón": { icon: lemon, library: "lab" },
  "piña": { icon: Citrus, library: "lucide" },
  "manzana": { icon: Citrus, library: "lucide" },
  "naranja": { icon: Citrus, library: "lucide" },
  "mango": { icon: Citrus, library: "lucide" },
  "coco": { icon: coconut, library: "lab" },
  "vainilla": { icon: flowerLotus, library: "lab" },
  "chocolate": { icon: coffeeBean, library: "lab" },
  "mora": { icon: Cherry, library: "lucide" },
};

function getFlavorIcon(name: string): React.ReactNode {
  const entry = FLAVOR_ICONS[name.toLowerCase()];
  if (!entry) return <Leaf className="h-4 w-4" />;
  if (entry.library === "lab") {
    return <Icon iconNode={entry.icon} className="h-4 w-4" />;
  }
  const LucideIcon = entry.icon;
  return <LucideIcon className="h-4 w-4" />;
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
