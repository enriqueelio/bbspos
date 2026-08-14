import type { Size } from "@bubba/types";
import { formatPrice } from "@bubba/types";
import { cn } from "../../lib/utils";

export interface SizeSelectorProps {
  sizes: Size[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function SizeSelector({
  sizes,
  selectedId,
  onSelect,
}: SizeSelectorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {sizes.map((size) => {
        const selected = size.id === selectedId;
        return (
          <button
            key={size.id}
            type="button"
            onClick={() => onSelect(size.id)}
            className={cn(
              "rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected && "border-primary ring-2 ring-primary/30",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">{size.name}</span>
              <span className="text-sm text-muted-foreground">{size.ml} ml</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-lg font-bold text-primary">
                {formatPrice(size.price)}
              </span>
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  selected ? "bg-primary" : "bg-muted",
                )}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
