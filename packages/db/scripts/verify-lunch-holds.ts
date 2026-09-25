// Verificación del apartado de cupo ("el primero que agarró gana").
// Crea un plato de prueba propio (nunca toca un plato real), comprueba que dos
// cajas no puedan vender las mismas unidades, que lo apartado se libere al
// vencer, que la caja que lo tenía pueda volver a tomar, y que el servidor
// rechace el pedido cuando el cupo ya no está. Todo se borra al terminar.
//
//   corepack pnpm --filter @bbspos/db verify:lunch-holds
import {
  prisma,
  lunchStockByItem,
  lunchStockHistory,
  acquireLunchHold,
  releaseLunchHold,
  releaseCartLunchHolds,
  touchCartLunchHolds,
  reconcileCartLunchHolds,
  assertLunchCapacity,
  consumeCartLunchHolds,
  LunchCapacityError,
  zonedDateKey,
} from "../src/index";

const today = zonedDateKey();
const TEST_NAME = "PRUEBA APARTADO (verificacion)";
const A = "verificacion-caja-A";
const B = "verificacion-caja-B";
const C = "verificacion-caja-C";
const D = "verificacion-caja-D";

let pass = 0;
let itemId: string | null = null;
const orderIds: string[] = [];

function assert(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (ok) pass += 1;
  console.log(`${ok ? "OK  " : "FALLA"} ${label}: ${actual} (esperado ${expected})`);
  if (!ok) process.exitCode = 1;
}

async function see(cartId: string | null, id: string, name: string) {
  const rows = await lunchStockByItem([{ id, name }], today, { excludeCartId: cartId });
  return rows.get(id)!;
}

async function rejects(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    console.log(`FALLA ${label}: se aceptó y no debía`);
    process.exitCode = 1;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`OK   ${label}: ${msg.slice(0, 78)}`);
    pass += 1;
  }
}

async function main() {
  // Restos de una corrida anterior no deben falsear el resultado.
  await prisma.lunchHold.deleteMany({ where: { cartId: { in: [A, B, C, D] } } });
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

  // 1. Sin cantidad asignada no se puede apartar nada.
  await rejects("sin cantidad no se aparta", () => acquireLunchHold(A, item.id, 1));

  // 2. Cuota de 10: la caja A aparta 4.
  await prisma.lunchQuota.create({
    data: { menuItemId: item.id, date: today, planned: 10 },
  });
  await acquireLunchHold(A, item.id, 4);
  let a = await see(A, item.id, item.name);
  let b = await see(B, item.id, item.name);
  assert("A ve 10 (su propio apartado no le resta)", a.remaining, 10);
  assert("B ve 6 (descontado lo de A)", b.remaining, 6);
  assert("apartado total 4", b.held, 4);

  // 3. B aparta 6 más: entre las dos agotan las 10 unidades. Cada caja ve el
  //    disponible para sí misma, así que A todavía puede sumar hasta 4 y B hasta
  //    6, pero el total apartado no puede pasar de 10.
  await acquireLunchHold(B, item.id, 6);
  a = await see(A, item.id, item.name);
  b = await see(B, item.id, item.name);
  assert("A ve 4 (lo de B descontado)", a.remaining, 4);
  assert("B ve 6 (lo de A no le resta)", b.remaining, 6);
  assert("apartado total 10", a.held, 10);

  // 4. El que agarró gana y el total nunca se pasa: con A=4 y B=6 la jornada está
  //    completa, así que a A le quedan 4 "disponibles" pero ya son los suyos.
  assert("heldByMe de A", a.heldByMe, 4);
  assert("heldByMe de B", b.heldByMe, 6);
  assert("heldByMe de C (no tiene nada)", (await see(C, item.id, item.name)).heldByMe, 0);
  await rejects("A no puede pasar de 10 en total", () => acquireLunchHold(A, item.id, 4));
  await rejects("A ya no puede tomar ni una más", () => acquireLunchHold(A, item.id, 1));
  await rejects("B ya no puede tomar más", () => acquireLunchHold(B, item.id, 1));
  await rejects("C no puede tomar ni una", () => acquireLunchHold(C, item.id, 1));

  // 5. B suelta 2 unidades: vuelven al común y A puede tomarlas.
  const left = await releaseLunchHold(B, item.id, 2);
  assert("B queda con 4 apartadas", left, 4);
  await acquireLunchHold(A, item.id, 2);
  const aHold = await prisma.lunchHold.findUniqueOrThrow({
    where: { menuItemId_date_cartId: { menuItemId: item.id, date: today, cartId: A } },
  });
  assert("A quedó con 6 apartadas", aHold.quantity, 6);

  // 6. Al vencer el apartado de una caja que se quedó colgada, las unidades
  //    vuelven a estar libres para las demás.
  await prisma.lunchHold.updateMany({
    where: { cartId: A },
    data: { expiresAt: new Date(Date.now() - 60_000) },
  });
  const c = await see(C, item.id, item.name);
  assert("vencido: C ve 6 (solo queda el apartado de B)", c.remaining, 6);
  assert("vencido: solo B mantiene el apartado", c.held, 4);
  await acquireLunchHold(C, item.id, 4);
  const c2 = await see(C, item.id, item.name);
  assert("C tomó 4 de las liberadas", c2.held, 8);
  await rejects("C no puede pasar de 6", () => acquireLunchHold(C, item.id, 3));

  // 7. touch renueva solo lo que está por vencer.
  assert("B con el apartado entero no renueva", await touchCartLunchHolds(B), 0);
  await prisma.lunchHold.updateMany({
    where: { cartId: B },
    data: { expiresAt: new Date(Date.now() + 3 * 60_000) },
  });
  assert("B renueva 1 apartado por vencer", await touchCartLunchHolds(B), 1);
  const bAfterTouch = await prisma.lunchHold.findFirstOrThrow({ where: { cartId: B } });
  assert(
    "el apartado de B volvió al TTL completo",
    bAfterTouch.expiresAt.getTime() - Date.now() > 15 * 60_000,
    true,
  );

  // 7b. Apartado vencido: la caja que lo tenía vuelve a poder tomar unidades.
  //     Antes su propia fila vencida se le sumaba y quedaba bloqueada para
  //     siempre sin poder volver a apartar el plato.
  await releaseCartLunchHolds(C);
  await prisma.lunchHold.updateMany({
    where: { cartId: A },
    data: { expiresAt: new Date(Date.now() - 60_000) },
  });
  const aRow = await prisma.lunchHold.findFirstOrThrow({ where: { cartId: A } });
  assert("la fila vencida de A sigue con 6", aRow.quantity, 6);
  await acquireLunchHold(A, item.id, 3);
  const aBack = await prisma.lunchHold.findFirstOrThrow({ where: { cartId: A } });
  assert("A volvió a apartar desde cero (3, no 6+3)", aBack.quantity, 3);
  await acquireLunchHold(A, item.id, 2);
  const aMore = await prisma.lunchHold.findFirstOrThrow({ where: { cartId: A } });
  assert("A sigue acumulando sobre su apartado vigente (3+2)", aMore.quantity, 5);
  assert("sin pasarse del total (4 de B + 5 de A)", (await see(null, item.id, item.name)).held, 9);
  await releaseLunchHold(A, item.id, 5);
  await acquireLunchHold(C, item.id, 4);
  assert("estado restaurado: B 4 + C 4", (await see(null, item.id, item.name)).held, 8);

  // 8. Reconciliación: el ticket volvió con líneas cuyo apartado ya no existe.
  const recon = await reconcileCartLunchHolds(B, [{ menuItemId: item.id, quantity: 2 }]);
  assert("reconcilia sin pérdidas", recon.lost.length, 0);
  assert("B queda con 2 apartadas", (await see(B, item.id, item.name)).held, 6);

  // Si otra caja se llevó todo, la reconciliación lo reporta.
  await releaseCartLunchHolds(C);
  await acquireLunchHold(C, item.id, 8);
  const reconFail = await reconcileCartLunchHolds(B, [{ menuItemId: item.id, quantity: 6 }]);
  assert("reconcilia avisa lo perdido", reconFail.lost.join(","), TEST_NAME);

  // 9. Barrera del servidor: con el apartado en la mano pasa; sin él, no.
  const demand = [{ menuItemId: item.id, name: item.name, quantity: 2 }];
  await assertLunchCapacity(prisma, B, demand, today);
  console.log("OK   con el apartado en la mano el pedido pasa el control");
  pass += 1;
  let capacityOk = false;
  try {
    await assertLunchCapacity(prisma, D, demand, today);
  } catch (e) {
    capacityOk = e instanceof LunchCapacityError;
  }
  assert("sin apartado el pedido se rechaza con error de cupo", capacityOk, true);

  // 10. Confirmar el pedido borra el apartado y las unidades pasan a vendidas.
  await releaseCartLunchHolds(C);
  assert("antes de confirmar hay 2 apartadas", (await see(null, item.id, item.name)).held, 2);
  const order = await prisma.order.create({
    data: {
      status: "ACEPTADO",
      orderDate: "1999-01-01",
      daySeq: 999501,
      customerName: TEST_NAME,
      total: 20,
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
  orderIds.push(order.id);
  assert("se consumieron 1 apartado", await consumeCartLunchHolds(prisma, B), 1);
  const finalRow = await see(null, item.id, item.name);
  assert("ya no hay apartado", finalRow.held, 0);
  assert("las 2 unidades cuentan como vendidas", finalRow.sold, 2);
  assert("disponible 10 − 2 vendidas", finalRow.remaining, 8);

  // El histórico del admin también ve el apartado.
  await acquireLunchHold(A, item.id, 3);
  const hist = await lunchStockHistory(2);
  const row = hist.find((h) => h.menuItemId === item.id);
  assert("histórico: apartado 3", row?.held, 3);
  assert("histórico: disponible 10 − 2 − 3", row?.remaining, 5);

  console.log(`\n${pass} comprobaciones OK.`);
}

main()
  .catch((e) => {
    console.error("Error en la verificación:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (itemId) {
      // Los pedidos se borran aparte; el plato se lleva por cascada las cuotas,
      // los ajustes y los apartados.
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
      await prisma.menuItem.deleteMany({ where: { id: itemId } });
      const left = await prisma.menuItem.count({ where: { name: TEST_NAME } });
      const holds = await prisma.lunchHold.count({ where: { cartId: { in: [A, B, C, D] } } });
      console.log(`Limpieza: platos=${left}, apartados de prueba=${holds}`);
    }
    await prisma.$disconnect();
  });
