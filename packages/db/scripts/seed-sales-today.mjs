/* Genera movimiento de ventas para probar los reportes del admin.
 *
 * Crea pedidos ENTREGADO (cobrados) con algunos ANULADO, usando el catálogo
 * real (tamaños, sabores, bobas, toppings, menú completo) y precios de
 * DrinkPrice. Conserva los pedidos existentes y continúa `seq` (global) y
 * `daySeq` (por día local America/La_Paz).
 *
 * Cubre TODOS los productos: cada plato, cada opción/variante y cada
 * combinación de bebida aparece al menos en un pedido cobrado, y cada día del
 * rango tiene al menos una venta en cada categoría.
 *
 * Uso:
 *   corepack pnpm --filter @bbspos/db exec tsx scripts/seed-sales-today.mjs
 *     -> hoy 11:00-15:00, 120 pedidos (comportamiento original)
 *
 *   ... seed-sales-today.mjs --from=2026-11-11T10:00 --to=2026-11-17T15:00 --count=560
 *     -> rango local arbitrario (últimos 7 días)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TZ = "America/La_Paz";
const CANCEL_RATE = 0.08;

const CUSTOMERS = [
  "María Fernández", "Juan Pérez", "Lucía Rojas", "Diego Salazar",
  "Carla Ortiz", "Pedro Antelo", "Sofía Vargas", "Andrés Mendoza",
  "Valeria Cruz", "Nicolás Blanco", "Camila Suárez", "Rodrigo Mesa",
  "Andrea Quiroga", "Marcos Luna", "Paola Rivero", "Santiago Paredes",
  "Fernanda Cabrera", "Luis Montero", "Gabriela Arias", "Tomás Garrido",
];

const DISCOUNT_REASONS = [
  "Promoción 2x1", "Cortesía del local", "Club lealtad", "Degustación",
];

const CANCEL_REASONS = [
  "El cliente se retiró", "Sin insumos", "Pedido duplicado", "Error de cobro",
];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

function weighted(pairs) {
  const r = Math.random();
  let acc = 0;
  for (const [weight, value] of pairs) {
    acc += weight;
    if (r <= acc) return value;
  }
  return pairs[pairs.length - 1][1];
}

function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Mazo que recorre todas las unidades una vez y luego se baraja de nuevo. */
function makeDeck(units) {
  let deck = shuffle(units);
  let index = 0;
  return () => {
    if (!units.length) return null;
    if (index >= deck.length) {
      deck = shuffle(units);
      index = 0;
    }
    return deck[index++];
  };
}

function laPazDayParts(date = new Date()) {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date).split("-").map(Number);
  return { year, month, day };
}

function laPazHour(date) {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ, hour: "2-digit", hour12: false,
    }).format(date),
  ) % 24;
}

function dayKey({ year, month, day }) {
  const p = (n) => String(n).padStart(2, "0");
  return `${year}-${p(month)}-${p(day)}`;
}

function dayKeyOf(date) {
  return dayKey(laPazDayParts(date));
}

// La Paz es UTC-4 todo el año: hora local h -> h+4 en UTC.
function localToUtc({ year, month, day, hour, minute }) {
  return new Date(Date.UTC(year, month - 1, day, hour + 4, minute, 0, 0));
}

function addLocalDays({ year, month, day }, days) {
  const d = new Date(Date.UTC(year, month - 1, day) + days * 86_400_000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Parsea "YYYY-MM-DDTHH:mm" como hora local. */
function parseLocalDateTime(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value ?? "");
  if (!m) return null;
  return {
    year: Number(m[1]), month: Number(m[2]), day: Number(m[3]),
    hour: Number(m[4]), minute: Number(m[5]),
  };
}

function argValue(name) {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
}

// Rango por defecto: hoy 11:00 - 15:00.
const today = laPazDayParts();
const defaultFrom = { ...today, hour: 11, minute: 0 };
const defaultTo = { ...today, hour: 15, minute: 0 };

const fromParts = parseLocalDateTime(argValue("from")) ?? defaultFrom;
const toParts = parseLocalDateTime(argValue("to")) ?? defaultTo;

const fromMs = localToUtc(fromParts).getTime();
const toMs = localToUtc(toParts).getTime();
if (!(toMs > fromMs)) throw new Error("El rango --to debe ser posterior a --from.");

const hoursSpan = (toMs - fromMs) / 3_600_000;
const DEFAULT_COUNT = Math.max(120, Math.round(hoursSpan * 18));
const COUNT = Math.max(1, Number(argValue("count") ?? DEFAULT_COUNT));

// Perfil horario: madrugada casi vacía, pico al mediodía y por la tarde-noche.
function hourWeight(hour) {
  if (hour >= 0 && hour < 7) return 0.04;
  if (hour < 10) return 0.25;
  if (hour < 11) return 0.4;
  if (hour < 15) return 1;
  if (hour < 18) return 0.5;
  if (hour < 22) return 0.85;
  return 0.2;
}

function sampleDate() {
  for (let i = 0; i < 2000; i++) {
    const ts = fromMs + Math.random() * (toMs - fromMs);
    const date = new Date(ts);
    if (Math.random() <= hourWeight(laPazHour(date))) return date;
  }
  return new Date(fromMs + Math.random() * (toMs - fromMs));
}

/** Instante aleatorio dentro de un día local, acotado al rango solicitado. */
function randomTimeInDay(day) {
  const dayStart = localToUtc({ ...day, hour: 0, minute: 0 }).getTime();
  const dayEnd = dayStart + 86_400_000;
  const lo = Math.max(dayStart, fromMs);
  const hi = Math.min(dayEnd, toMs);
  const prefLo = Math.max(lo, dayStart + 10 * 3_600_000);
  const prefHi = Math.min(hi, dayStart + 19 * 3_600_000);
  const a = prefLo < prefHi ? prefLo : lo;
  const b = prefLo < prefHi ? prefHi : hi;
  return new Date(a + Math.random() * Math.max(1, b - a));
}

async function main() {
  const [users, sizes, bobas, flavors, toppings, prices, menuItems] =
    await Promise.all([
      prisma.user.findMany({
        where: { username: { in: ["cajero", "mesero", "admin"] } },
        select: { id: true, username: true },
      }),
      prisma.size.findMany({ where: { available: true }, select: { id: true, name: true } }),
      prisma.bobaType.findMany({ where: { available: true }, select: { id: true, name: true } }),
      prisma.flavor.findMany({
        where: { available: true },
        select: { id: true, name: true, categories: { select: { category: true } } },
      }),
      prisma.topping.findMany({ where: { available: true }, select: { id: true, name: true, price: true } }),
      prisma.drinkPrice.findMany({
        select: { id: true, category: true, price: true, sizeId: true, bobaTypeId: true },
      }),
      prisma.menuItem.findMany({
        where: { available: true },
        select: {
          id: true,
          name: true,
          category: true,
          price: true,
          options: { select: { id: true, name: true, price: true } },
        },
      }),
    ]);

  if (!users.length) throw new Error("No hay usuarios cajero/mesero/admin. Corre el seed base.");
  if (!sizes.length || !bobas.length || !flavors.length || !prices.length) {
    throw new Error("Catálogo incompleto (tamaños, bobas, sabores o precios).");
  }
  if (!menuItems.length) throw new Error("No hay platos disponibles en el menú.");

  const sizeById = new Map(sizes.map((s) => [s.id, s]));
  const bobaById = new Map(bobas.map((b) => [b.id, b]));

  const flavorsByCategory = new Map();
  for (const f of flavors) {
    for (const link of f.categories) {
      if (!flavorsByCategory.has(link.category)) flavorsByCategory.set(link.category, []);
      flavorsByCategory.get(link.category).push(f);
    }
  }

  // Una unidad por producto concreto:
  // - bebida: combinación de precio (categoría + tamaño + boba) x sabor.
  // - plato: cada opción/variante del plato (o el plato si no tiene opciones).
  const drinkUnits = [];
  for (const combo of prices) {
    for (const flavor of flavorsByCategory.get(combo.category) ?? []) {
      drinkUnits.push({ combo, flavor });
    }
  }
  const foodUnits = [];
  for (const item of menuItems) {
    if (!item.options.length) {
      foodUnits.push({ item, option: null });
    } else {
      for (const option of item.options) foodUnits.push({ item, option });
    }
  }
  if (!drinkUnits.length) throw new Error("No hay combinaciones de bebida válidas.");

  const foodCategories = [...new Set(menuItems.map((i) => i.category))].sort();
  const foodUnitsByCategory = new Map();
  for (const unit of foodUnits) {
    if (!foodUnitsByCategory.has(unit.item.category)) {
      foodUnitsByCategory.set(unit.item.category, []);
    }
    foodUnitsByCategory.get(unit.item.category).push(unit);
  }
  const categoryCursor = new Map();
  const nextCategoryUnit = (category) => {
    const units = foodUnitsByCategory.get(category) ?? [];
    if (!units.length) return null;
    const i = categoryCursor.get(category) ?? 0;
    categoryCursor.set(category, i + 1);
    return units[i % units.length];
  };

  const cajero = users.find((u) => u.username === "cajero");
  const mesero = users.find((u) => u.username === "mesero");
  const admin = users.find((u) => u.username === "admin");
  const userPool = [
    [0.6, cajero?.id],
    [0.25, mesero?.id],
    [0.15, admin?.id],
  ].filter(([, id]) => id);

  const maxSeq = await prisma.order.findFirst({ orderBy: { seq: "desc" }, select: { seq: true } });
  let seq = (maxSeq?.seq ?? 0) + 1;

  const makeDrink = ({ combo, flavor }) => {
    const size = sizeById.get(combo.sizeId);
    const boba = bobaById.get(combo.bobaTypeId);
    const quantity = weighted([[0.75, 1], [0.25, 2]]);
    const itemToppings = [];
    if (Math.random() < 0.35 && toppings.length) {
      const t = pick(toppings);
      itemToppings.push({ toppingId: t.id, toppingName: t.name, unitPrice: t.price });
    }
    return {
      data: {
        sizeId: size?.id,
        flavorId: flavor.id,
        bobaTypeId: boba?.id,
        sizeName: size?.name,
        flavorName: flavor.name,
        flavorCategory: combo.category,
        bobaTypeName: boba?.name,
        unitPrice: combo.price,
        quantity,
        toppings: { create: itemToppings },
      },
      subtotal: (combo.price + itemToppings.reduce((s, t) => s + t.unitPrice, 0)) * quantity,
    };
  };

  const makeFood = ({ item, option }) => {
    const quantity = item.category === "GASEOSAS"
      ? weighted([[0.7, 1], [0.2, 2], [0.1, 3]])
      : weighted([[0.85, 1], [0.15, 2]]);
    const unitPrice = option?.price ?? item.price;
    return {
      data: {
        menuItemId: item.id,
        menuItemOptionId: option?.id ?? null,
        menuItemName: item.name,
        menuItemCategory: item.category,
        menuItemOptionName: option?.name ?? null,
        unitPrice,
        quantity,
      },
      subtotal: unitPrice * quantity,
    };
  };

  const foodKey = (unit) => `${unit.item.id}:${unit.option?.id ?? ""}`;
  const drinkKey = (unit) => `${unit.combo.id}:${unit.flavor.id}`;

  const drawDrink = makeDeck(drinkUnits);
  const drawFood = makeDeck(foodUnits);
  const paidFood = new Set();
  const paidDrink = new Set();
  const foodSpec = (unit) => ({ kind: "food", unit });
  const drinkSpec = (unit) => ({ kind: "drink", unit });

  const orders = [];

  const buildOrder = (createdAt, specs, { forcePaid = false } = {}) => {
    const orderDate = dayKeyOf(createdAt);
    const lines = specs.map((s) => (s.kind === "drink" ? makeDrink(s.unit) : makeFood(s.unit)));

    const subtotal = lines.reduce((s, l) => s + l.subtotal, 0);
    const hasDiscount = Math.random() < 0.12 && subtotal > 5;
    const discountAmount = hasDiscount
      ? Math.min(Math.round((subtotal * rand(5, 20)) / 100), subtotal - 1)
      : 0;
    const total = subtotal - discountAmount;

    const cancelled = !forcePaid && Math.random() < CANCEL_RATE;
    const userId = weighted(userPool);

    let acceptedAt = null;
    let paidAt = null;
    let deliveredAt = null;
    let paymentMethod = null;
    let paymentMethod2 = null;
    let paymentAmount2 = null;
    let cancelledAt = null;
    let cancelReason = null;

    if (cancelled) {
      cancelledAt = new Date(createdAt.getTime() + rand(1, 10) * 60_000);
      cancelReason = pick(CANCEL_REASONS);
    } else {
      acceptedAt = new Date(createdAt.getTime() + rand(0, 2) * 60_000);
      paidAt = new Date(createdAt.getTime() + rand(1, 6) * 60_000);
      deliveredAt = new Date(paidAt.getTime() + rand(2, 25) * 60_000);

      paymentMethod = weighted([[0.45, "EFECTIVO"], [0.4, "QR"], [0.15, "TARJETA"]]);
      if (Math.random() < 0.08) {
        const second = weighted([[0.5, "EFECTIVO"], [0.3, "QR"], [0.2, "TARJETA"]]);
        if (second !== paymentMethod) {
          paymentMethod2 = second;
          paymentAmount2 = Math.max(1, Math.round((total * rand(15, 50)) / 100));
        }
      }
    }

    const order = {
      orderDate,
      status: cancelled ? "ANULADO" : "ENTREGADO",
      customerName: pick(CUSTOMERS),
      deliveryType: weighted([[0.45, "MESA"], [0.45, "LLEVAR"], [0.10, "DELIVERY"]]),
      total,
      createdAt,
      acceptedAt,
      paidAt,
      deliveredAt,
      cancelledAt,
      cancelReason,
      canceledById: cancelled ? userId : null,
      userId,
      paymentMethod,
      paymentMethod2,
      paymentAmount2,
      discountAmount,
      discountReason: hasDiscount ? pick(DISCOUNT_REASONS) : null,
      discountedAt: hasDiscount ? deliveredAt ?? createdAt : null,
      discountedById: hasDiscount ? userId : null,
      delayNotified: false,
      tiempoEstimado: 10,
      items: lines.map((l) => l.data),
      _specs: specs,
    };
    orders.push(order);

    if (!cancelled) {
      for (const s of specs) {
        if (s.kind === "drink") paidDrink.add(drinkKey(s.unit));
        else paidFood.add(foodKey(s.unit));
      }
    }
    return order;
  };

  // 1) Pedidos aleatorios: bebida + plato garantizados y extras opcionales.
  const randomOrder = () => {
    const createdAt = sampleDate();
    const specs = [drinkSpec(drawDrink())];
    if (Math.random() < 0.9) specs.push(foodSpec(drawFood()));
    if (Math.random() < 0.45) specs.push(drinkSpec(drawDrink()));
    if (Math.random() < 0.25) specs.push(foodSpec(drawFood()));
    buildOrder(createdAt, specs);
  };
  for (let i = 0; i < COUNT; i++) randomOrder();

  // 2) Cobertura de productos: todo ítem/variante aparece cobrado al menos una vez.
  for (const unit of drinkUnits) {
    if (!paidDrink.has(drinkKey(unit))) buildOrder(sampleDate(), [drinkSpec(unit)], { forcePaid: true });
  }
  for (const unit of foodUnits) {
    if (!paidFood.has(foodKey(unit))) buildOrder(sampleDate(), [foodSpec(unit)], { forcePaid: true });
  }

  // 3) Cobertura por día: cada categoría (incluida Bubbas) vende en cada jornada.
  const days = [];
  for (let d = { ...fromParts }; localToUtc({ ...d, hour: 0, minute: 0 }).getTime() < toMs; d = addLocalDays(d, 1)) {
    days.push({ ...d });
  }
  for (const day of days) {
    const key = dayKey(day);
    const present = new Set();
    for (const o of orders) {
      if (o.orderDate !== key) continue;
      for (const s of o._specs) {
        present.add(s.kind === "drink" ? "BUBAS" : s.unit.item.category);
      }
    }
    for (const category of [...foodCategories, "BUBAS"]) {
      if (present.has(category)) continue;
      const unit = category === "BUBAS" ? drawDrink() : nextCategoryUnit(category);
      if (!unit) continue;
      buildOrder(
        randomTimeInDay(day),
        [category === "BUBAS" ? drinkSpec(unit) : foodSpec(unit)],
        { forcePaid: true },
      );
    }
  }

  orders.sort((a, b) => a.createdAt - b.createdAt);

  // daySeq se reinicia por día local: continúa desde el máximo de cada día.
  const dayKeys = [...new Set(orders.map((o) => o.orderDate))];
  const nextDaySeq = new Map();
  for (const key of dayKeys) {
    const last = await prisma.order.findFirst({
      where: { orderDate: key },
      orderBy: { daySeq: "desc" },
      select: { daySeq: true },
    });
    nextDaySeq.set(key, (last?.daySeq ?? 0) + 1);
  }

  for (const o of orders) {
    o.seq = seq++;
    const next = nextDaySeq.get(o.orderDate);
    o.daySeq = next;
    nextDaySeq.set(o.orderDate, next + 1);
  }

  await prisma.$transaction(
    async (tx) => {
      for (const o of orders) {
        const { items, _specs, ...orderData } = o;
        await tx.order.create({ data: { ...orderData, items: { create: items } } });
      }
    },
    { timeout: 600_000, maxWait: 30_000 },
  );

  const generated = await prisma.order.aggregate({
    where: { createdAt: { gte: new Date(fromMs), lt: new Date(toMs) } },
    _count: true,
    _sum: { total: true, discountAmount: true },
  });
  const cancelledCount = await prisma.order.count({
    where: { createdAt: { gte: new Date(fromMs), lt: new Date(toMs) }, status: "ANULADO" },
  });

  const byDay = {};
  for (const o of orders) {
    if (!byDay[o.orderDate]) byDay[o.orderDate] = { count: 0, first: o.daySeq, last: o.daySeq };
    byDay[o.orderDate].count += 1;
    byDay[o.orderDate].first = Math.min(byDay[o.orderDate].first, o.daySeq);
    byDay[o.orderDate].last = Math.max(byDay[o.orderDate].last, o.daySeq);
  }

  console.log("== Ventas generadas ==");
  console.log(`Rango local: ${fromParts.year}-${String(fromParts.month).padStart(2, "0")}-${String(fromParts.day).padStart(2, "0")}T${String(fromParts.hour).padStart(2, "0")}:${String(fromParts.minute).padStart(2, "0")} .. ${toParts.year}-${String(toParts.month).padStart(2, "0")}-${String(toParts.day).padStart(2, "0")}T${String(toParts.hour).padStart(2, "0")}:${String(toParts.minute).padStart(2, "0")}`);
  console.log(`UTC: ${new Date(fromMs).toISOString()} .. ${new Date(toMs).toISOString()}`);
  console.log(`Productos cubiertos: ${drinkUnits.length} bebidas / ${foodUnits.length} platos-variantes`);
  console.log(`Pedidos creados: ${orders.length} (${cancelledCount} anulados)`);
  console.log(`Total neto en el rango: Bs ${generated._sum.total ?? 0} | Descuentos: Bs ${generated._sum.discountAmount ?? 0}`);
  console.log(`seq: ${orders[0]?.seq ?? "-"}..${orders[orders.length - 1]?.seq ?? "-"}`);
  console.log("Por día (pedidos, daySeq):", JSON.stringify(byDay));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
