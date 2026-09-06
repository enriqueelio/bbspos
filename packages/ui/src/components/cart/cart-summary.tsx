import type { CartItem } from "@bbspos/types";
import { MenuCategoryLabel, cartItemUnitTotal, formatPrice } from "@bbspos/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";

export interface CartSummaryProps {
  items: CartItem[];
}

export function CartSummary({ items }: CartSummaryProps) {
  const total = items.reduce(
    (acc, item) => acc + cartItemUnitTotal(item) * item.quantity,
    0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen del pedido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {items.map((item) => {
          const lineTotal = cartItemUnitTotal(item) * item.quantity;
          return (
            <div key={item.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-muted-foreground">
                  {item.quantity}×{" "}
                  {item.kind === "DRINK"
                    ? `${item.size.name} · ${item.flavor.name} · ${item.bobaType.name}`
                    : item.name}
                </span>
                <span className="font-medium">{formatPrice(lineTotal)}</span>
              </div>
              {item.kind === "DRINK" && item.toppings.length > 0 && (
                <div className="pl-2 text-xs text-muted-foreground">
                  +{" "}
                  {item.toppings
                    .map((t) => `${t.name} (${formatPrice(t.price)})`)
                    .join(", ")}
                </div>
              )}
              {item.kind === "MENU_ITEM" && (
                <div className="pl-2 text-xs text-muted-foreground">
                  {MenuCategoryLabel[item.category]}
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
