export const FlavorCategory = {
  MILK: "MILK",
  WATER: "WATER",
  SPECIAL: "SPECIAL",
} as const;

export type FlavorCategory =
  (typeof FlavorCategory)[keyof typeof FlavorCategory];

export const FlavorCategoryLabel: Record<FlavorCategory, string> = {
  MILK: "Leche",
  WATER: "Agua",
  SPECIAL: "Especiales",
};

export interface Size {
  id: string;
  name: string;
  ml: number;
  price: number;
  available: boolean;
}

export interface Flavor {
  id: string;
  name: string;
  category: FlavorCategory;
  price: number;
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
  price: number;
  available: boolean;
}

export interface Catalog {
  sizes: Size[];
  flavors: Flavor[];
  bobaTypes: BobaType[];
}

export interface DrinkSelection {
  sizeId: string;
  flavorId: string;
  bobaTypeId: string;
}

export interface CartItem {
  id: string;
  size: Size;
  flavor: Flavor;
  bobaType: BobaType;
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

export const FlavorCategoryList: FlavorCategory[] = [
  FlavorCategory.MILK,
  FlavorCategory.WATER,
  FlavorCategory.SPECIAL,
];

export interface OrderItem {
  id: string;
  sizeName: string;
  flavorName: string;
  flavorCategory: FlavorCategory;
  bobaTypeName: string;
  unitPrice: number;
  quantity: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  items: OrderItem[];
}

export function computeDrinkPrice(
  size: Size,
  flavor: Flavor,
  bobaType: BobaType,
): number {
  return size.price + flavor.price + bobaType.price;
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(cents / 100);
}
