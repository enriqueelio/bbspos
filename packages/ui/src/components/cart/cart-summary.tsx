import type { CartItem } from "@bubba/types";
import { computeDrinkPrice, formatPrice } from "@bubba/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";

export interface CartSummaryProps {
  items: CartItem[];
}

export function CartSummary({ items }: CartSummaryProps) {
  const total = items.reduce(
    (acc, item) => acc + computeDrinkPrice(item.size, item.flavor, item.bobaType) * item.quantity,
    0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen del pedido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {items.map((item) => {
          const unitPrice = computeDrinkPrice(
            item.size,
            item.flavor,
            item.bobaType,
          );
          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2"
            >
              <span className="truncate text-muted-foreground">
                {item.quantity}× {item.size.name} · {item.flavor.name} ·{" "}
                {item.bobaType.name}
              </span>
              <span className="font-medium">
                {formatPrice(unitPrice * item.quantity)}
              </span>
            </div>
          );
        })}
      </CardContent>
      <CardFooter className="border-t pt-4">
        <div className="flex w-full items-center justify-between">
          <span className="text-sm font-semibold">Total</span>
          <span className="text-xl font-bold">{formatPrice(total)}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
