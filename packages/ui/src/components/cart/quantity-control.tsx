import { Minus, Plus } from "lucide-react";
import { Button } from "../ui/button";

export interface QuantityControlProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
}

export function QuantityControl({
  value,
  onChange,
  min = 1,
}: QuantityControlProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Disminuir cantidad"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className="w-8 text-center text-sm font-semibold">{value}</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Aumentar cantidad"
        onClick={() => onChange(value + 1)}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
