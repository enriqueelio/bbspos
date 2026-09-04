import type { CartItem } from "@bbspos/types";
import { FlavorCategoryLabel, formatPrice, sumToppings } from "@bbspos/types";
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
  const lineTotal = (item.unitPrice + sumToppings(item.toppings)) * item.quantity;

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="font-semibold">
            {item.size.name} · {item.flavor.name}
          </div>
          <div className="text-sm text-muted-foreground">
            {FlavorCategoryLabel[item.category]} · {item.bobaType.name}
          </div>
          {item.toppings.length > 0 && (
            <div className="mt-1 text-xs text-muted-foreground">
              Toppings:{" "}
              {item.toppings
                .map((t) => `${t.name} (+${formatPrice(t.price)})`)
                .join(", ")}
            </div>
          )}
          <div className="mt-1 text-sm font-medium text-primary">
            {formatPrice(item.unitPrice + sumToppings(item.toppings))} c/u
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <QuantityControl
            value={item.quantity}
            onChange={(q) => onUpdateQuantity(item.id, q)}
          />
          <div className="w-20 text-right font-bold">
            {formatPrice(lineTotal)}
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
