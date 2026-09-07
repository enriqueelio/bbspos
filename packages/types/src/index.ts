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

/** Sección gastronómica de un platillo del menú (mismo patrón que FlavorCategory).
 *  ALMUERZO es la sección dinámica del Menú del Día; el resto forma la carta fija. */
export const MenuCategory = {
  ALMUERZO: "ALMUERZO",
  SANDWICH: "SANDWICH",
  PANINI: "PANINI",
  ENSALADA: "ENSALADA",
  PIQUEO: "PIQUEO",
  COMPARTIR: "COMPARTIR",
  ALITA: "ALITA",
  HAMBURGUESA: "HAMBURGUESA",
  MILANESA: "MILANESA",
  LOMO: "LOMO",
  POLLO: "POLLO",
  KIDS: "KIDS",
  POSTRE: "POSTRE",
  WAFFLE: "WAFFLE",
  PANCAKE: "PANCAKE",
  EXTRAS: "EXTRAS",
  BEBIDA: "BEBIDA",
} as const;

export type MenuCategory =
  (typeof MenuCategory)[keyof typeof MenuCategory];

export const MenuCategoryLabel: Record<MenuCategory, string> = {
  ALMUERZO: "Almuerzos",
  SANDWICH: "Sandwiches de Milanesa",
  PANINI: "Paninis",
  ENSALADA: "Ensaladas",
  PIQUEO: "Piqueos",
  COMPARTIR: "Para Compartir",
  ALITA: "Alitas",
  HAMBURGUESA: "Hamburguesas",
  MILANESA: "Milanesas",
  LOMO: "Lomos",
  POLLO: "Pollos",
  KIDS: "Menú Kids",
  POSTRE: "Postres y Helados",
  WAFFLE: "Bubble Waffles",
  PANCAKE: "Pancakes",
  EXTRAS: "Extras",
  BEBIDA: "Bebidas",
};

export const MenuCategoryList: MenuCategory[] = [
  MenuCategory.SANDWICH,
  MenuCategory.PANINI,
  MenuCategory.ENSALADA,
  MenuCategory.PIQUEO,
  MenuCategory.COMPARTIR,
  MenuCategory.ALITA,
  MenuCategory.HAMBURGUESA,
  MenuCategory.MILANESA,
  MenuCategory.LOMO,
  MenuCategory.POLLO,
  MenuCategory.KIDS,
  MenuCategory.POSTRE,
  MenuCategory.WAFFLE,
  MenuCategory.PANCAKE,
  MenuCategory.EXTRAS,
  MenuCategory.BEBIDA,
];

/** Variante con precio propio de un platillo de la carta (misma base del Menú). */
export interface MenuItemOptionView {
  id: string;
  name: string;
  price: number;
}

/** Vista de un platillo entregado a las terminales: solo Menú del Día vigente
 *  (ALMUERZO) o items de la carta (cualquier otra categoría). */
export interface MenuItemView {
  id: string;
  name: string;
  category: MenuCategory;
  price: number;
  description: string | null;
  options: MenuItemOptionView[];
}

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
  menuItems: MenuItemView[];
  /** Platazos de la carta fija (categorías distintas de ALMUERZO). */
  cartaItems: MenuItemView[];
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

/** Bebida del carrito con su configuración completa (sabor/tamaño/boba/extras). */
export interface DrinkCartItem {
  kind: "DRINK";
  id: string;
  size: Size;
  flavor: Flavor;
  category: FlavorCategory;
  bobaType: BobaType;
  unitPrice: number;
  toppings: CartTopping[];
  quantity: number;
}

/** Platillo agregado con precio fijo. Si tiene variante (Pollo/Res) se guarda
 *  el nombre de la opción elegida y su precio como unitPrice. */
export interface MenuItemCartItem {
  kind: "MENU_ITEM";
  id: string;
  menuItemId: string;
  name: string;
  category: MenuCategory;
  unitPrice: number;
  optionName: string | null;
  quantity: number;
}

export type CartItem = DrinkCartItem | MenuItemCartItem;

/** Suma unitaria (sin multiplicar por cantidad) del ítem de carrito. */
export function cartItemUnitTotal(item: CartItem): number {
  return item.kind === "DRINK"
    ? item.unitPrice + sumToppings(item.toppings)
    : item.unitPrice;
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
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  CAJERO: "CAJERO",
  MESERO: "MESERO",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const RoleLabel: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrador",
  CAJERO: "Cajero",
  MESERO: "Mesero",
};

/** Roles asignables por un ADMIN o SUPER_ADMIN en el selector general. */
export const RoleList: Role[] = [Role.ADMIN, Role.CAJERO, Role.MESERO];

/** Todos los roles del sistema, incluido el protegido SUPER_ADMIN. */
export const RoleListAll: Role[] = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.CAJERO,
  Role.MESERO,
];

export const Shift = {
  MANANA: "MANANA",
  TARDE: "TARDE",
  SIN_TURNO: "SIN_TURNO",
} as const;

export type Shift = (typeof Shift)[keyof typeof Shift];

export const ShiftLabel: Record<Shift, string> = {
  MANANA: "Mañana",
  TARDE: "Tarde",
  SIN_TURNO: "Sin turno",
};

export const ShiftList: Shift[] = [Shift.MANANA, Shift.TARDE, Shift.SIN_TURNO];

export interface StaffUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  shift: Shift;
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
  sizeName: string | null;
  flavorName: string | null;
  flavorCategory: FlavorCategory | null;
  bobaTypeName: string | null;
  menuItemName: string | null;
  menuItemCategory: MenuCategory | null;
  menuItemOptionName: string | null;
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
  userShift?: Shift | null;
  paymentMethod?: PaymentMethod | null;
  paymentMethod2?: PaymentMethod | null;
  paymentAmount2?: number | null;
  discountAmount?: number;
  discountReason?: string | null;
  discountedBy?: { name: string; role: Role } | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  canceledBy?: { name: string; role: Role } | null;
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
  category: FlavorCategory | MenuCategory;
  orders: number;
  units: number;
  revenue: number;
}

export interface PaymentBreakdownRow {
  method: PaymentMethod;
  orders: number;
  revenue: number;
}

/** Reporte independiente de métodos de pago (EFECTIVO / QR / TARJETA). */
export interface PaymentsData {
  summary: {
    revenueTotal: number;
    ordersTotal: number;
    methodsCount: number;
  };
  breakdown: PaymentBreakdownRow[];
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

/**
 * Lista de todas las ventas del rango con detalle por orden + resumen.
 * Incluye TODAS las órdenes (incluidas anuladas).
 */
export interface DayTotalOrderRow {
  seq: number | null;
  createdAt: string;
  customerName: string | null;
  total: number;
  discountAmount: number;
  discountReason: string | null;
}

export interface DayTotalData {
  orders: DayTotalOrderRow[];
  summary: {
    ordersTotal: number;
    revenueTotal: number;
    discountsTotal: number;
    netTotal: number;
  };
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

export interface DashboardEmployeeRow {
  userId: string;
  userName: string;
  ordersProcessed: number;
  revenueTotal: number;
}

export interface DashboardSummaryData {
  today: { revenue: number; orders: number; avgTicket: number };
  yesterday: { revenue: number; orders: number; avgTicket: number };
  deltaPct: { revenue: number | null; orders: number | null };
  last7Days: { revenue: number; orders: number; avgTicket: number };

  /** 1. Ventas netas totales del periodo (Bs). */
  netSales: number;
  /** 2. Crecimiento vs periodo anterior (%). */
  growthPct: number | null;
  /** 3. Ticket promedio por orden (Bs). */
  avgTicket: number;
  /** 4. Volumen de ordenes procesadas. */
  ordersVolume: number;
  /** 5. Tasa de ordenes anuladas (%). */
  cancelledPct: number;
  /** 6. Monto total en descuentos (Bs). */
  discountsTotal: number;
  /** 7. Hora de mayor facturacion (0-23, null si sin datos). */
  peakHour: number | null;
  /** 8. Categoria estrella (MILK/WATER/SPECIAL, null si sin datos). */
  bestCategory: FlavorCategory | null;
  /** 9. Metodo de pago preferido (desglose porcentual). */
  paymentsToday: PaymentBreakdownRow[];
  /** 10. Tiempo promedio de entrega (minutos). */
  avgDeliveryMinutes: number;
  /** 11. Pedidos pendientes / en cola (KDS live). */
  pendingOrders: number;
  /** 12. Rendimiento por empleado. */
  staffPerformance: DashboardEmployeeRow[];
  /** 13. Costo de anulaciones (Bs). */
  cancellationsCost: number;
  /** 14. Rotacion del menu (% sin movimiento). */
  menuRotationPct: number;
  /** 15. Margen de toppings / extras (% sobre venta total). */
  toppingsMarginPct: number;
}

/** Zona horaria del negocio (acorde a lib/day.ts y al worker de cierre). */
export const BUSINESS_TIME_ZONE = "America/La_Paz";

/** Hora local (HH:MM) desde la que se habilita el envío manual del cierre de caja. */
export const MANUAL_REPORT_CUTOFF = "23:10";
export const MANUAL_REPORT_CUTOFF_MINUTES = 23 * 60 + 10;

/** Minutos transcurridos del día en la zona horaria indicada (seguro para cliente). */
export function zonedClockMinutes(
  date: Date,
  timeZone: string = BUSINESS_TIME_ZONE,
): number {
  const [h, m] = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(date)
    .split(":")
    .map(Number);
  return h * 60 + m;
}
