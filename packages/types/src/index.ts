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
  imageUrl: string | null;
  options: MenuItemOptionView[];
}

export interface Size {
  id: string;
  name: string;
  oz: number;
  available: boolean;
  imageUrl: string | null;
}

export interface Flavor {
  id: string;
  name: string;
  categories: FlavorCategory[];
  available: boolean;
  imageUrl: string | null;
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
  imageUrl: string | null;
}

export interface Topping {
  id: string;
  name: string;
  price: number;
  available: boolean;
  imageUrl: string | null;
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
 *  el nombre de la opción elegida y su precio como unitPrice. `detail` guarda
 *  el detalle elegido por el cajero (p.ej. las salsas de las Alitas Mixtas)
 *  para imprimirlo con claridad en la comanda. */
export interface MenuItemCartItem {
  kind: "MENU_ITEM";
  id: string;
  menuItemId: string;
  name: string;
  category: MenuCategory;
  unitPrice: number;
  optionName: string | null;
  detail?: string | null;
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

export const OrderType = {
  MESA: "MESA",
  LLEVAR: "LLEVAR",
  DELIVERY: "DELIVERY",
} as const;

export type OrderType = (typeof OrderType)[keyof typeof OrderType];

export const OrderTypeList: OrderType[] = [
  OrderType.MESA,
  OrderType.LLEVAR,
  OrderType.DELIVERY,
];

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
  PENSION: "PENSION",
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentMethodLabel: Record<PaymentMethod, string> = {
  EFECTIVO: "Efectivo",
  QR: "QR",
  TARJETA: "Tarjeta",
  PENSION: "Pensionado",
};

export const PaymentMethodList: PaymentMethod[] = [
  PaymentMethod.EFECTIVO,
  PaymentMethod.QR,
  PaymentMethod.TARJETA,
  PaymentMethod.PENSION,
];

/** Métodos de pago que el cajero puede registrar al aceptar un pedido.
 *  PENSION se maneja aparte (Cuenta Pensionado) por su lógica de saldo. */
export const AcceptablePayment: PaymentMethod[] = [
  PaymentMethod.EFECTIVO,
  PaymentMethod.QR,
];

/** Modalidad de cuenta corriente de un cliente/pensionado. */
export const PensionType = {
  PREPAGO: "PREPAGO",
  POSTPAGO: "POSTPAGO",
} as const;

export type PensionType = (typeof PensionType)[keyof typeof PensionType];

export const PensionTypeLabel: Record<PensionType, string> = {
  PREPAGO: "Prepago",
  POSTPAGO: "Postpago",
};

export const PensionTypeList: PensionType[] = [
  PensionType.PREPAGO,
  PensionType.POSTPAGO,
];

/** Tipos de movimiento de la cuenta corriente (CustomerLedger). */
export const CustomerLedgerType = {
  RECARGA: "RECARGA",
  PAGO_DEUDA: "PAGO_DEUDA",
  CONSUMO: "CONSUMO",
} as const;

export type CustomerLedgerType =
  (typeof CustomerLedgerType)[keyof typeof CustomerLedgerType];

export const CustomerLedgerTypeLabel: Record<CustomerLedgerType, string> = {
  RECARGA: "Recarga de saldo",
  PAGO_DEUDA: "Pago de deuda",
  CONSUMO: "Consumo",
};

/** Vista de un cliente/pensionado para el módulo de cuentas corrientes. */
export interface CustomerView {
  id: string;
  name: string;
  ci: string | null;
  phone: string;
  pensionType: PensionType;
  /** Positivo = saldo a favor (Prepago); negativo = deuda (Postpago). */
  balance: number;
  /** Límite de deuda permitido para Postpago (0 = sin límite). */
  creditLimit: number;
  createdAt: string;
}

/** Movimiento de la cuenta corriente listado en la UI admin. */
export interface CustomerLedgerView {
  id: string;
  customerId: string;
  type: CustomerLedgerType;
  amount: number;
  paymentMethod: PaymentMethod | null;
  orderId: string | null;
  createdAt: string;
}

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
  /** Minutos estimados de producción de este producto (más uno de los
   *  ingredientes, ej. la carne o la base saborizante). */
  tiempoProduccion?: number;
  toppings: OrderItemTopping[];
}

export interface Order {
  id: string;
  seq: number | null;
  orderDate?: string | null;
  daySeq?: number | null;
  status: OrderStatus;
  customerName: string | null;
  notes?: string | null;
  customerId?: string | null;
  orderType?: OrderType;
  total: number;
  createdAt: string;
  acceptedAt?: string | null;
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
  /** Minutos estimados de producción del pedido = max(tiempoProduccion de sus
   *  items). Frente al reloj unificado (acceptedAt ?? createdAt), la demora
   *  es: transcurrido - tiempoEstimado. */
  tiempoEstimado?: number;
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
  return String(seq ?? 0).padStart(3, "0").slice(-3);
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
  daySeq: number | null;
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

// ===== Cierre de caja (arqueo de efectivo y contraste) =====

/** Denominaciones de la gaveta (Bs): billetes de 200..10, monedas de 5, 2, 1
 *  y la fraccionaria de 0,50 Bs. Los totales pueden quedar en .50. */
export const CashDenominations = [200, 100, 50, 20, 10, 5, 2, 1, 0.5] as const;

/** Cantidad contada de una denominación (valor en Bs + unidades). */
export interface CashDenominationCount {
  value: number;
  count: number;
}

/** Contraste del día según el sistema (para la vista de Cierre de Caja).
 *  Los pagos divididos ya quedaron prorrateados entre sus métodos. */
export interface CashCloseStats {
  date: string;
  deliveredOrders: number;
  /** Ventas del día cobradas en efectivo (incluye la parte efectivo de divididos). */
  systemCash: number;
  /** Ventas del día cobradas por QR (incluye la parte QR de divididos). */
  systemQr: number;
  systemCard: number;
  /** Consumos cobrados a cuenta de pensionados (NO entran a la caja). */
  pensionSales: number;
  /** Recargas / pagos de deuda de pensionados en efectivo (ingreso real de caja). */
  rechargeCash: number;
  /** Recargas / pagos de deuda de pensionados por QR (ingreso real de caja). */
  rechargeQr: number;
  /** Efectivo esperado en gaveta = systemCash + rechargeCash. */
  expectedCash: number;
  /** Pedidos del día con pago dividido (efectivo + QR prorrateado). */
  splitOrders: number;
}

/** Registro histórico de un cierre de caja guardado en CashClose. */
export interface CashCloseRecord {
  id: string;
  date: string;
  closedAt: string;
  userName: string;
  denominations: CashDenominationCount[];
  countedCash: number;
  systemCash: number;
  systemQr: number;
  systemCard: number;
  pensionSales: number;
  rechargeCash: number;
  rechargeQr: number;
  expectedCash: number;
  diffCash: number;
  notes: string | null;
}

/** Reconstruye el desglose de denominaciones guardado como JSON ["200",2,...]. */
export function parseDenominations(json: string): CashDenominationCount[] {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    const result: CashDenominationCount[] = [];
    for (const pair of parsed) {
      if (
        !Array.isArray(pair) ||
        pair.length !== 2 ||
        typeof pair[0] !== "number" ||
        typeof pair[1] !== "number"
      ) {
        continue;
      }
      result.push({ value: pair[0], count: pair[1] });
    }
    return result;
  } catch {
    return [];
  }
}

/** Serializa el desglose de denominaciones para la columna denominations. */
export function stringifyDenominations(
  counts: CashDenominationCount[],
): string {
  return JSON.stringify(
    counts.map((c) => [c.value, c.count]),
  );
}
