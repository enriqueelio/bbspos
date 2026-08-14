import type { CartItem } from "@bubba/types";
import { formatPrice, sumToppings } from "@bubba/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";

export interface CartSummaryProps {
  items: CartItem[];
}

export function CartSummary({ items }: CartSummaryProps) {
  const total = items.reduce(
    (acc, item) =>
      acc + (item.unitPrice + sumToppings(item.toppings)) * item.quantity,
    0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen del pedido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {items.map((item) => {
          const lineTotal =
            (item.unitPrice + sumToppings(item.toppings)) * item.quantity;
          return (
            <div key={item.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-muted-foreground">
                  {item.quantity}× {item.size.name} · {item.flavor.name} ·{" "}
                  {item.bobaType.name}
                </span>
                <span className="font-medium">{formatPrice(lineTotal)}</span>
              </div>
              {item.toppings.length > 0 && (
                <div className="pl-2 text-xs text-muted-foreground">
                  +{" "}
                  {item.toppings
                    .map((t) => `${t.name} (${formatPrice(t.price)})`)
                    .join(", ")}
                </div>
              )}
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
