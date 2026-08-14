import type { BobaType } from "@bubba/types";
import { BobaKindLabel, formatPrice } from "@bubba/types";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";

export interface BobaPickerProps {
  bobaTypes: BobaType[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function BobaPicker({
  bobaTypes,
  selectedId,
  onSelect,
}: BobaPickerProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {bobaTypes.map((boba) => {
        const selected = boba.id === selectedId;
        return (
          <button
            key={boba.id}
            type="button"
            onClick={() => onSelect(boba.id)}
            className={cn(
              "rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected && "border-primary ring-2 ring-primary/30",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{boba.name}</div>
                <Badge
                  variant="outline"
                  className="mt-1"
                >
                  {BobaKindLabel[boba.kind]}
                </Badge>
              </div>
              <span className="text-lg font-bold text-primary">
                {formatPrice(boba.price)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
