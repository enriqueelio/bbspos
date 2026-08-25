import type { Flavor, FlavorCategory } from "@bubba/types";
import { FlavorCategoryLabel } from "@bubba/types";
import { cn } from "../../lib/utils";
import { GlassWater, Cherry, Leaf, Coffee, Cookie, Citrus, Banana, Sparkles } from "lucide-react";

const FLAVOR_ICON_KEYWORDS: [string, React.ReactNode][] = [
  ["fresa", <Cherry className="h-4 w-4" />],
  ["mango", <Citrus className="h-4 w-4" />],
  ["taro", <Sparkles className="h-4 w-4" />],
  ["matcha", <Leaf className="h-4 w-4" />],
  ["vainilla", <Cookie className="h-4 w-4" />],
  ["chocolate", <Coffee className="h-4 w-4" />],
  ["cafe", <Coffee className="h-4 w-4" />],
  ["limon", <Citrus className="h-4 w-4" />],
  ["piña", <Citrus className="h-4 w-4" />],
  ["coco", <Cookie className="h-4 w-4" />],
  ["plátano", <Banana className="h-4 w-4" />],
  ["banana", <Banana className="h-4 w-4" />],
];

function getFlavorIcon(name: string): React.ReactNode {
  const lower = name.toLowerCase();
  for (const [keyword, icon] of FLAVOR_ICON_KEYWORDS) {
    if (lower.includes(keyword)) return icon;
  }
  return <GlassWater className="h-4 w-4" />;
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
