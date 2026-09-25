// Verificación del cálculo de cantidades por jornada de los almuerzos del día.
// Crea un plato de prueba propio (nunca toca un plato real ni sus cuotas),
// comprueba programmed/sold/remaining, el umbral, la reserva por fecha y la
// restitución al anular, y borra todo al terminar aunque falle a la mitad.
//
//   corepack pnpm --filter @bbspos/db verify:lunch-stock
import {
  prisma,
  lunchStockByItem,
  lunchStockHistory,
  zonedDateKey,
  shiftDayKey,
} from "../src/index";

const today = zonedDateKey();
const tomorrow = shiftDayKey(today, 1);
const TEST_NAME = "PRUEBA CANTIDAD (verificacion)";

let pass = 0;
let itemId: string | null = null;
const orderIds: string[] = [];

function assert(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (ok) pass += 1;
  console.log(`${ok ? "OK  " : "FALLA"} ${label}: ${actual} (esperado ${expected})`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  // Un plato homónimo de una corrida anterior no debe falsear el resultado.
  await prisma.order.deleteMany({ where: { customerName: TEST_NAME } });
  await prisma.menuItem.deleteMany({ where: { name: TEST_NAME } });

  const item = await prisma.menuItem.create({
    data: {
      name: TEST_NAME,
      category: "ALMUERZO",
      price: 10,
      available: true,
      enMenuDelDia: true,
      menuDelDiaDate: today,
    },
    select: { id: true, name: true },
  });
  itemId = item.id;
  console.log(`Plato de prueba: ${item.name} (${item.id})`);

  // Sin cuota no hay control de cantidad.
  let rows = await lunchStockByItem([{ id: item.id, name: item.name }]);
  assert("sin cuota: planned null", rows.get(item.id)?.planned, null);
  assert("sin cuota: remaining null", rows.get(item.id)?.remaining, null);
  assert("sin cuota: lowThreshold 5", rows.get(item.id)?.lowThreshold, 5);

  // Cuota de 10 unidades para hoy.
  await prisma.lunchQuota.create({
    data: { menuItemId: item.id, date: today, planned: 10 },
  });
  rows = await lunchStockByItem([{ id: item.id, name: item.name }]);
  assert("cuota 10: remaining 10", rows.get(item.id)?.remaining, 10);

  // Un pedido de HOY con 3 unidades descuenta 3.
  const order = await prisma.order.create({
    data: {
      status: "ACEPTADO",
      orderDate: "1999-01-01",
      daySeq: 999001,
      customerName: TEST_NAME,
      total: 30,
      items: {
        create: [
          {
            menuItemName: item.name,
            menuItemCategory: "ALMUERZO",
            unitPrice: 10,
            quantity: 3,
          },
        ],
      },
    },
    select: { id: true },
  });
  orderIds.push(order.id);
  rows = await lunchStockByItem([{ id: item.id, name: item.name }]);
  assert("pedido de 3 hoy: sold 3", rows.get(item.id)?.sold, 3);
  assert("pedido de 3 hoy: remaining 7", rows.get(item.id)?.remaining, 7);

  // Una reserva para MAÑANA descuenta en mañana, no en hoy.
  const reserve = await prisma.order.create({
    data: {
      status: "ACEPTADO",
      orderDate: "1999-01-01",
      daySeq: 999002,
      customerName: TEST_NAME,
      total: 20,
      scheduledFor: new Date(`${tomorrow}T12:00:00`),
      items: {
        create: [
          {
            menuItemName: item.name,
            menuItemCategory: "ALMUERZO",
            unitPrice: 10,
            quantity: 2,
          },
        ],
      },
    },
    select: { id: true },
  });
  orderIds.push(reserve.id);
  rows = await lunchStockByItem([{ id: item.id, name: item.name }], today);
  assert("reserva de mañana: hoy sold 3", rows.get(item.id)?.sold, 3);
  assert("reserva de mañana: hoy remaining 7", rows.get(item.id)?.remaining, 7);

  // Ajuste manual de +5, con nota y usuario.
  const quota = await prisma.lunchQuota.findUniqueOrThrow({
    where: { menuItemId_date: { menuItemId: item.id, date: today } },
  });
  await prisma.lunchAdjust.create({
    data: { quotaId: quota.id, delta: 5, note: "salida de cocina", userId: "test" },
  });
  rows = await lunchStockByItem([{ id: item.id, name: item.name }]);
  assert("ajuste +5: remaining 12", rows.get(item.id)?.remaining, 12);

  // El umbral de aviso es configurable por plato y jornada.
  await prisma.lunchQuota.update({
    where: { id: quota.id },
    data: { lowThreshold: 3 },
  });
  rows = await lunchStockByItem([{ id: item.id, name: item.name }]);
  assert("umbral configurable 3", rows.get(item.id)?.lowThreshold, 3);

  // Anular restituye lo que el pedido consumió.
  await prisma.order.update({ where: { id: order.id }, data: { status: "ANULADO" } });
  rows = await lunchStockByItem([{ id: item.id, name: item.name }]);
  assert("anulado: sold 0", rows.get(item.id)?.sold, 0);
  assert("anulado: remaining 15", rows.get(item.id)?.remaining, 15);

  // Marcar entregado NO restituye: el consumo fue al crear el pedido.
  await prisma.order.update({ where: { id: order.id }, data: { status: "ENTREGADO" } });
  rows = await lunchStockByItem([{ id: item.id, name: item.name }]);
  assert("entregado: sold 3", rows.get(item.id)?.sold, 3);
  assert("entregado: remaining 12", rows.get(item.id)?.remaining, 12);

  // El histórico del admin muestra la comparación de la jornada.
  const history = await lunchStockHistory(3);
  const todayRow = history.find((h) => h.date === today && h.menuItemId === item.id);
  assert("histórico: fila de hoy", todayRow?.planned, 10);
  assert("histórico: vendido de hoy", todayRow?.sold, 3);
  assert("histórico: restante de hoy", todayRow?.remaining, 12);

  console.log(`\n${pass} comprobaciones OK.`);
}

main()
  .catch((e) => {
    console.error("Error en la verificación:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (itemId) {
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
      // La cuota, sus ajustes y los apartados se van con la cascada del plato.
      await prisma.menuItem.deleteMany({ where: { id: itemId } });
      const left = await prisma.menuItem.count({ where: { name: TEST_NAME } });
      console.log(`Limpieza: platos de prueba restantes=${left}`);
    }
    await prisma.$disconnect();
  });
