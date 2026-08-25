import type { Flavor, FlavorCategory } from "@bubba/types";
import { FlavorCategoryLabel } from "@bubba/types";
import { cn } from "../../lib/utils";
import { Coffee, Cookie, Leaf, Citrus, Cherry, Flower2, Sparkles } from "lucide-react";

const FLAVOR_ICONS: Record<string, React.ReactNode> = {
  "capuchino": <Coffee className="h-4 w-4" />,
  "oreo": <Cookie className="h-4 w-4" />,
  "fruticoco": <Cherry className="h-4 w-4" />,
  "matcha": <Leaf className="h-4 w-4" />,
  "piña colada": <Citrus className="h-4 w-4" />,
  "limonada brasilera": <Citrus className="h-4 w-4" />,
  "frutilimon": <Cherry className="h-4 w-4" />,
  "taro": <Sparkles className="h-4 w-4" />,
  "frutilla": <Cherry className="h-4 w-4" />,
  "limón": <Citrus className="h-4 w-4" />,
  "piña": <Citrus className="h-4 w-4" />,
  "manzana": <Citrus className="h-4 w-4" />,
  "naranja": <Citrus className="h-4 w-4" />,
  "mango": <Citrus className="h-4 w-4" />,
  "coco": <Cookie className="h-4 w-4" />,
  "vainilla": <Flower2 className="h-4 w-4" />,
  "chocolate": <Cookie className="h-4 w-4" />,
  "mora": <Cherry className="h-4 w-4" />,
};

function getFlavorIcon(name: string): React.ReactNode {
  return FLAVOR_ICONS[name.toLowerCase()] ?? <Coffee className="h-4 w-4" />;
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
