import type { Flavor, FlavorCategory } from "@bubba/types";
import { FlavorCategoryLabel } from "@bubba/types";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";

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
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {FlavorCategoryLabel[category]}
        </h3>
        <Badge variant="secondary">{categoryFlavors.length}</Badge>
      </div>
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
                  "rounded-xl border bg-card px-4 py-3 text-left transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected && "border-primary ring-2 ring-primary/30",
                )}
              >
                <span className="font-medium">{flavor.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
