export const FlavorCategory = {
  MILK: "MILK",
  WATER: "WATER",
  SPECIAL: "SPECIAL",
} as const;

export type FlavorCategory =
  (typeof FlavorCategory)[keyof typeof FlavorCategory];

export const FlavorCategoryLabel: Record<FlavorCategory, string> = {
  MILK: "Con leche",
  WATER: "Con agua",
  SPECIAL: "Especiales",
};

export const FlavorCategoryList: FlavorCategory[] = [
  FlavorCategory.SPECIAL,
  FlavorCategory.WATER,
  FlavorCategory.MILK,
];

export interface Size {
  id: string;
  name: string;
  oz: number;
  available: boolean;
}

export interface Flavor {
  id: string;
  name: string;
  categories: FlavorCategory[];
  available: boolean;
}

export const BobaKind = {
  TAPIOCA: "TAPIOCA",
  POPPING: "POPPING",
} as const;

export type BobaKind = (typeof BobaKind)[keyof typeof BobaKind];

export const BobaKindLabel: Record<BobaKind, string> = {
  TAPIOCA: "Tapioca",
  POPPING: "Explosivas",
};

export interface BobaType {
  id: string;
  name: string;
  kind: BobaKind;
  available: boolean;
}

export interface Topping {
  id: string;
  name: string;
  price: number;
  available: boolean;
}

export interface DrinkPrice {
  id: string;
  category: FlavorCategory;
  sizeId: string;
  bobaTypeId: string;
  price: number;
}

export interface Catalog {
  sizes: Size[];
  flavors: Flavor[];
  bobaTypes: BobaType[];
  drinkPrices: DrinkPrice[];
  toppings: Topping[];
}

export interface DrinkSelection {
  category: FlavorCategory | null;
  flavorId: string | null;
  sizeId: string | null;
  bobaTypeId: string | null;
  toppingIds: string[];
}

export interface CartTopping {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  id: string;
  size: Size;
  flavor: Flavor;
  category: FlavorCategory;
  bobaType: BobaType;
  unitPrice: number;
  toppings: CartTopping[];
  quantity: number;
}

export const OrderStatus = {
  RECIBIDO: "RECIBIDO",
  EN_PREPARACION: "EN_PREPARACION",
  ENTREGADO: "ENTREGADO",
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const OrderStatusSequence: OrderStatus[] = [
  OrderStatus.RECIBIDO,
  OrderStatus.EN_PREPARACION,
  OrderStatus.ENTREGADO,
];

export const OrderStatusLabel: Record<OrderStatus, string> = {
  RECIBIDO: "Recibido",
  EN_PREPARACION: "En preparación",
  ENTREGADO: "Entregado",
};

export interface OrderItemTopping {
  toppingName: string;
  unitPrice: number;
}

export interface OrderItem {
  id: string;
  sizeName: string;
  flavorName: string;
  flavorCategory: FlavorCategory;
  bobaTypeName: string;
  unitPrice: number;
  quantity: number;
  toppings: OrderItemTopping[];
}

export interface Order {
  id: string;
  status: OrderStatus;
  customerName: string | null;
  total: number;
  createdAt: string;
  items: OrderItem[];
}

export function findDrinkPrice(
  drinkPrices: DrinkPrice[],
  category: FlavorCategory,
  sizeId: string,
  bobaTypeId: string,
): DrinkPrice | undefined {
  return drinkPrices.find(
    (p) =>
      p.category === category &&
      p.sizeId === sizeId &&
      p.bobaTypeId === bobaTypeId,
  );
}

export function computeBasePrice(
  drinkPrices: DrinkPrice[],
  category: FlavorCategory,
  sizeId: string,
  bobaTypeId: string,
): number | null {
  const entry = findDrinkPrice(drinkPrices, category, sizeId, bobaTypeId);
  return entry ? entry.price : null;
}

export function sumToppings(toppings: Pick<Topping, "price">[]): number {
  return toppings.reduce((acc, t) => acc + t.price, 0);
}

export function computeItemPrice(
  basePrice: number,
  toppings: Pick<Topping, "price">[],
): number {
  return basePrice + sumToppings(toppings);
}

export function formatPrice(bs: number): string {
  return `${bs} Bs`;
}
