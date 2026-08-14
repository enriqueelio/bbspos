import type { CartItem } from "@bubba/types";
import { computeDrinkPrice, formatPrice } from "@bubba/types";
import { Trash2 } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { QuantityControl } from "./quantity-control";

export interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
}: CartItemRowProps) {
  const unitPrice = computeDrinkPrice(item.size, item.flavor, item.bobaType);

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="font-semibold">{item.size.name}</div>
          <div className="text-sm text-muted-foreground">
            {item.flavor.name} · {item.bobaType.name}
          </div>
          <div className="mt-1 text-sm font-medium text-primary">
            {formatPrice(unitPrice)} c/u
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <QuantityControl
            value={item.quantity}
            onChange={(q) => onUpdateQuantity(item.id, q)}
          />
          <div className="w-20 text-right font-bold">
            {formatPrice(unitPrice * item.quantity)}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Quitar del carrito"
            onClick={() => onRemove(item.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
