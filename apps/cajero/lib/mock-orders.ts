import {
  FlavorCategory,
  MenuCategory,
  PaymentMethod,
  OrderStatus,
  OrderType,
  type Order,
  type OrderItem,
} from "@bbspos/types";

const NOW = Date.now();

function minutesAgo(m: number): string {
  return new Date(NOW - m * 60_000).toISOString();
}

function drink(opts: {
  id: string;
  flavorName: string;
  bobaTypeName: string;
  unitPrice: number;
  quantity?: number;
  toppings?: { toppingName: string; unitPrice: number }[];
}): OrderItem {
  return {
    id: opts.id,
    sizeName: "Grande",
    flavorName: opts.flavorName,
    flavorCategory: FlavorCategory.MILK,
    bobaTypeName: opts.bobaTypeName,
    menuItemName: null,
    menuItemCategory: null,
    menuItemOptionName: null,
    unitPrice: opts.unitPrice,
    quantity: opts.quantity ?? 1,
    toppings: opts.toppings ?? [],
  };
}

function menuItem(opts: {
  id: string;
  menuItemName: string;
  menuItemCategory: MenuCategory;
  menuItemOptionName?: string;
  unitPrice: number;
  quantity?: number;
}): OrderItem {
  return {
    id: opts.id,
    sizeName: null,
    flavorName: null,
    flavorCategory: null,
    bobaTypeName: null,
    menuItemName: opts.menuItemName,
    menuItemCategory: opts.menuItemCategory,
    menuItemOptionName: opts.menuItemOptionName ?? null,
    unitPrice: opts.unitPrice,
    quantity: opts.quantity ?? 1,
    toppings: [],
  };
}

export const mockOrders: Order[] = [
  {
    id: "mock-1-recibido-fresco",
    seq: 31,
    orderDate: "2026-09-10",
    daySeq: 31,
    status: OrderStatus.RECIBIDO,
    customerName: "Lucía Fernández",
    orderType: OrderType.MESA,
    notes: "Mesa 3 · Bienvenida",
    total: 56,
    createdAt: minutesAgo(2),
    paidAt: null,
    deliveredAt: null,
    delayNotified: false,
    items: [
      drink({
        id: "mock-1-i1",
        flavorName: "Taro",
        bobaTypeName: "Cassava",
        unitPrice: 22,
        toppings: [{ toppingName: "Perlas", unitPrice: 4 }],
      }),
      menuItem({
        id: "mock-1-i2",
        menuItemName: "Milanesa 4 Quesos",
        menuItemCategory: MenuCategory.MILANESA,
        menuItemOptionName: "Papas fritas",
        unitPrice: 30,
      }),
    ],
  },
  {
    id: "mock-2-aceptado",
    seq: 32,
    orderDate: "2026-09-10",
    daySeq: 32,
    status: OrderStatus.ACEPTADO,
    customerName: "Jorge Mamani",
    orderType: OrderType.LLEVAR,
    notes: "Sin hielo",
    total: 56,
    createdAt: minutesAgo(5),
    acceptedAt: minutesAgo(5),
    paidAt: null,
    deliveredAt: null,
    delayNotified: false,
    items: [
      menuItem({
        id: "mock-2-i1",
        menuItemName: "Alitas Mixtas 6 pzas",
        menuItemCategory: MenuCategory.ALITA,
        menuItemOptionName: "Salsa BBQ",
        unitPrice: 38,
      }),
      drink({
        id: "mock-2-i2",
        flavorName: "Matcha",
        bobaTypeName: "Cassava",
        unitPrice: 18,
      }),
    ],
  },
  {
    id: "mock-3-entregado-sin-cobrar",
    seq: 33,
    orderDate: "2026-09-10",
    daySeq: 33,
    status: OrderStatus.ENTREGADO,
    customerName: "María Gutiérrez",
    orderType: OrderType.DELIVERY,
    total: 50,
    createdAt: minutesAgo(15),
    acceptedAt: minutesAgo(12),
    deliveredAt: minutesAgo(8),
    paidAt: null,
    delayNotified: false,
    items: [
      menuItem({
        id: "mock-3-i1",
        menuItemName: "Bubble Waffle con helado",
        menuItemCategory: MenuCategory.WAFFLE,
        unitPrice: 28,
      }),
      drink({
        id: "mock-3-i2",
        flavorName: "Taro",
        bobaTypeName: "Cassava",
        unitPrice: 22,
      }),
    ],
  },
  {
    id: "mock-4-entregado-cobrado",
    seq: 34,
    orderDate: "2026-09-10",
    daySeq: 34,
    status: OrderStatus.ENTREGADO,
    customerName: "Rodrigo Quispe",
    orderType: OrderType.MESA,
    total: 56,
    createdAt: minutesAgo(30),
    acceptedAt: minutesAgo(27),
    deliveredAt: minutesAgo(24),
    paidAt: minutesAgo(24),
    paymentMethod: PaymentMethod.EFECTIVO,
    delayNotified: false,
    items: [
      menuItem({
        id: "mock-4-i1",
        menuItemName: "Lomo Saltado",
        menuItemCategory: MenuCategory.LOMO,
        menuItemOptionName: "Arroz y papas",
        unitPrice: 34,
      }),
      drink({
        id: "mock-4-i2",
        flavorName: "Matcha",
        bobaTypeName: "Cassava",
        unitPrice: 22,
      }),
    ],
  },
  {
    id: "mock-5-pagado-sin-entregar",
    seq: 35,
    orderDate: "2026-09-10",
    daySeq: 35,
    status: OrderStatus.ACEPTADO,
    customerName: "Ana Vargas",
    orderType: OrderType.LLEVAR,
    total: 46,
    createdAt: minutesAgo(8),
    acceptedAt: minutesAgo(8),
    paidAt: minutesAgo(6),
    deliveredAt: null,
    paymentMethod: PaymentMethod.QR,
    delayNotified: false,
    items: [
      menuItem({
        id: "mock-5-i1",
        menuItemName: "Pancake con frutas",
        menuItemCategory: MenuCategory.PANCAKE,
        unitPrice: 24,
      }),
      drink({
        id: "mock-5-i2",
        flavorName: "Taro",
        bobaTypeName: "Cassava",
        unitPrice: 22,
      }),
    ],
  },
  {
    id: "mock-6-aceptado-critico",
    seq: 36,
    orderDate: "2026-09-10",
    daySeq: 36,
    status: OrderStatus.ACEPTADO,
    customerName: "Carlos Rojas",
    orderType: OrderType.DELIVERY,
    total: 70,
    createdAt: minutesAgo(35),
    acceptedAt: minutesAgo(35),
    paidAt: null,
    deliveredAt: null,
    delayNotified: false,
    items: [
      drink({
        id: "mock-6-i1",
        flavorName: "Oreo",
        bobaTypeName: "Cassava",
        unitPrice: 22,
        quantity: 3,
        toppings: [{ toppingName: "Perlas", unitPrice: 4 }],
      }),
    ],
  },
];