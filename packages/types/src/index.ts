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
  ACEPTADO: "ACEPTADO",
  ENTREGADO: "ENTREGADO",
  ANULADO: "ANULADO",
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const OrderStatusSequence: OrderStatus[] = [
  OrderStatus.RECIBIDO,
  OrderStatus.ACEPTADO,
  OrderStatus.ENTREGADO,
];

export const OrderStatusLabel: Record<OrderStatus, string> = {
  RECIBIDO: "Recibido",
  ACEPTADO: "Aceptado",
  ENTREGADO: "Entregado",
  ANULADO: "Anulado",
};

export const Role = {
  ADMIN: "ADMIN",
  CAJERO: "CAJERO",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const RoleLabel: Record<Role, string> = {
  ADMIN: "Administrador",
  CAJERO: "Cajero",
};

export const RoleList: Role[] = [Role.ADMIN, Role.CAJERO];

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
}

export function formatDurationMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`;
}

export const PaymentMethod = {
  EFECTIVO: "EFECTIVO",
  QR: "QR",
  TARJETA: "TARJETA",
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentMethodLabel: Record<PaymentMethod, string> = {
  EFECTIVO: "Efectivo",
  QR: "QR",
  TARJETA: "Tarjeta",
};

export const PaymentMethodList: PaymentMethod[] = [
  PaymentMethod.EFECTIVO,
  PaymentMethod.QR,
  PaymentMethod.TARJETA,
];

/** Métodos de pago que el cajero puede registrar al aceptar un pedido. */
export const AcceptablePayment: PaymentMethod[] = [
  PaymentMethod.EFECTIVO,
  PaymentMethod.QR,
];

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
  seq: number | null;
  status: OrderStatus;
  customerName: string | null;
  total: number;
  createdAt: string;
  paidAt?: string | null;
  deliveredAt?: string | null;
  items: OrderItem[];
  userId?: string | null;
  userName?: string | null;
  paymentMethod?: PaymentMethod | null;
  paymentMethod2?: PaymentMethod | null;
  paymentAmount2?: number | null;
  discountAmount?: number;
  discountReason?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  delayNotified?: boolean;
}

export interface CashierDailyData {
  date: string;
  revenueTotal: number;
  deliveredOrders: number;
  avgTicket: number;
  avgDeliveryMinutes: number | null;
  myDeliveredOrders: number;
  myAvgDeliveryMinutes: number | null;
  paymentBreakdown: {
    method: PaymentMethod;
    orders: number;
    revenue: number;
  }[];
}

export function formatOrderCode(seq: number | null | undefined): string {
  return String(seq ?? 0).padStart(5, "0");
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

export type Granularity = "day" | "week" | "month";
export type ReportFormat = "json" | "csv";
export type TopProductsGroupBy =
  | "drink"
  | "flavor"
  | "size"
  | "bobaType"
  | "topping";

export interface ReportMeta {
  report: string;
  from: string;
  to: string;
  generatedAt: string;
  currency: "BOB";
}

export interface ReportEnvelope<T> {
  data: T;
  meta: ReportMeta;
}

export interface ReportError {
  error: {
    code:
      | "INVALID_PARAMETER"
      | "MISSING_PARAMETER"
      | "INVALID_DATE_RANGE"
      | "UNAUTHENTICATED"
      | "NOT_FOUND"
      | "DATE_RANGE_TOO_LARGE"
      | "NOT_IMPLEMENTED_SCHEMA"
      | "INTERNAL_ERROR";
    message: string;
  };
}

export interface CategoryBreakdownRow {
  category: FlavorCategory;
  orders: number;
  units: number;
  revenue: number;
}

export interface PaymentBreakdownRow {
  method: PaymentMethod;
  orders: number;
  revenue: number;
}

export interface DailyReportData {
  date: string;
  revenueTotal: number;
  ordersTotal: number;
  avgTicket: number;
  itemsSold: number;
  toppingsRevenue: number;
  byCategory: CategoryBreakdownRow[];
  paymentBreakdown: PaymentBreakdownRow[] | null;
  discountsTotal: number | null;
  cancellationsCount: number | null;
}

export interface SalesRangePoint {
  bucket: string;
  orders: number;
  revenue: number;
  avgTicket: number;
}

export interface SalesRangeData {
  summary: {
    revenueTotal: number;
    ordersTotal: number;
    avgTicket: number;
    bestDay: { date: string; revenue: number } | null;
    comparisonPrevPeriod: { revenueDeltaPct: number } | null;
  };
  series: SalesRangePoint[];
}

export interface PeakHoursData {
  hourly: { hour: number; orders: number; revenue: number }[];
  peakHour: { hour: number; orders: number } | null;
  quietHour: { hour: number; orders: number } | null;
}

export interface StaffPerformanceRow {
  user: { id: string; name: string };
  ordersProcessed: number;
  revenueTotal: number;
  avgTicket: number;
  shareOfRevenuePct: number;
}

export interface AdjustmentItem {
  type: "discount" | "cancellation";
  orderId: string;
  orderSeq: number | null;
  amount: number;
  reason: string;
  byUser: { id: string; name: string } | null;
  at: string;
}

export interface AdjustmentsData {
  summary: {
    discountsCount: number;
    discountsTotal: number;
    cancellationsCount: number;
    cancellationsLostRevenue: number;
  };
  items: AdjustmentItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface TopProductRow {
  rank: number;
  key: string;
  unitsSold: number;
  revenue: number;
  unitPriceAvg: number;
}

export interface SlowMoverRow {
  key: string;
  unitsSold: number;
  revenue: number;
  available: boolean;
}

export interface CategorySalesData {
  categories: {
    category: FlavorCategory;
    unitsSold: number;
    revenue: number;
    sharePct: number;
    avgTicketItem: number;
  }[];
  bestCategory: FlavorCategory | null;
}

export interface DashboardSummaryData {
  today: { revenue: number; orders: number; avgTicket: number };
  yesterday: { revenue: number; orders: number; avgTicket: number };
  deltaPct: { revenue: number | null; orders: number | null };
  last7Days: { revenue: number; orders: number; avgTicket: number };
  pendingOrders: number;
}
