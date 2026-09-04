import type { Size } from "@bbspos/types";
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
    <div className="grid gap-3 sm:grid-cols-2">
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
              <span className="text-sm text-muted-foreground">{size.oz} oz</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
