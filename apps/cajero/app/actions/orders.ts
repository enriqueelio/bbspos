"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@bbspos/db";
import {
  AcceptablePayment,
  OrderStatus,
  PensionType,
  PaymentMethod,
  Role,
  formatPrice,
  type PaymentMethod as PaymentMethodType,
  type PensionType as PensionTypeType,
} from "@bbspos/types";
import { getRequiredSession } from "@/lib/session";

/** Acepta en la cola un pedido RECIBIDO proveniente de la tienda web: lo pasa
 *  a ACEPTADO (empieza a prepararse en cocina) y arranca el timer de
 *  producción (acceptedAt). El cobro y la entrega se gestionan por separado;
 *  la comanda ya se imprimió al crear el pedido en el store. */
export async function acceptQueueOrder(orderId: string) {
  // Exige sesión iniciada; cualquier rol del terminal puede aceptar.
  await getRequiredSession();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error("Pedido no encontrado.");
  }

  if (order.status === OrderStatus.ANULADO) {
    throw new Error("El pedido está anulado.");
  }

  if (order.status !== OrderStatus.RECIBIDO) {
    throw new Error("Este pedido ya fue aceptado.");
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.ACEPTADO,
      acceptedAt: new Date(),
    },
  });

  revalidatePath("/");
}

/** Registra el pago de un pedido. Al cobrar un pedido RECIBIDO (proveniente
 *  de la tienda web) lo pasa a ACEPTADO; los pedidos ya ACEPTADO o ENTREGADO
 *  (tomados en el POS) se cobran sin cambiar su estado, pues el cliente puede
 *  pagar después, incluso tras la entrega. La comanda ya se imprimió al crear. */
export async function acceptOrder(
  orderId: string,
  method: string,
  method2?: string,
  amount2?: number,
) {
  const session = await getRequiredSession();

  if (session.user.role === Role.MESERO) {
    throw new Error("No autorizado. Los meseros no pueden registrar pagos.");
  }

  if (!AcceptablePayment.includes(method as PaymentMethodType)) {
    throw new Error("Selecciona un método de pago válido: Efectivo o QR.");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { toppings: true } } },
  });

  if (!order) {
    throw new Error("Pedido no encontrado.");
  }

  if (order.status === OrderStatus.ANULADO) {
    throw new Error("El pedido está anulado.");
  }

  if (
    order.status !== OrderStatus.RECIBIDO &&
    order.status !== OrderStatus.ACEPTADO &&
    order.status !== OrderStatus.ENTREGADO
  ) {
    throw new Error("No se puede registrar el pago de este pedido.");
  }

  if (order.paidAt) {
    throw new Error("Este pedido ya fue cobrado.");
  }

  let paymentMethod2: PaymentMethodType | null = null;
  let paymentAmount2: number | null = null;

  if (method2 && amount2 !== undefined) {
    if (!AcceptablePayment.includes(method2 as PaymentMethodType)) {
      throw new Error("El segundo método de pago no es válido.");
    }
    if (method2 === method) {
      throw new Error("Los dos métodos de pago deben ser distintos.");
    }
    if (amount2 <= 0) {
      throw new Error("El monto del segundo pago debe ser mayor a cero.");
    }
    if (amount2 >= order.total) {
      throw new Error("El monto del segundo pago debe ser menor al total.");
    }
    paymentMethod2 = method2 as PaymentMethodType;
    paymentAmount2 = Math.trunc(amount2);
  }

  // El pedido ya cobrado o el usuario de la sesión pueden no existir en la DB
  // (p. ej. usuario eliminado tras el login). Verificamos antes de asignar la
  // llave foránea para no violar la restricción (P2003).
  let userId = order.userId;
  if (!userId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });
    userId = dbUser ? dbUser.id : null;
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      // Un pedido en RECIBIDO (web/store) se acepta al cobrarlo; los que ya
      // están ACEPTADO o ENTREGADO conservan su estado (el cobro es aparte).
      ...(order.status === OrderStatus.RECIBIDO
        ? { status: OrderStatus.ACEPTADO }
        : {}),
      paymentMethod: method as PaymentMethodType,
      paymentMethod2,
      paymentAmount2,
      paidAt: new Date(),
      userId,
    },
  });

  revalidatePath("/");
}

/** Cobra un pedido contra la cuenta corriente de un cliente/pensionado
 *  (método "Cuenta Pensionado"). El dinero NO entra a la caja de ese turno.
 *  - Prepago: exige saldo >= total y lo descuenta.
 *  - Postpago: descuenta el total (puede quedar en deuda) siempre que la nueva
 *    deuda no supere su creditLimit (si tiene uno configurado).
 *  El consumo se registra en CustomerLedger para el cierre diario. */
export async function acceptPensionOrder(orderId: string, customerId: string) {
  const session = await getRequiredSession();

  if (session.user.role === Role.MESERO) {
    throw new Error("No autorizado. Los meseros no pueden registrar pagos.");
  }

  const [order, customer] = await Promise.all([
    prisma.order.findUnique({ where: { id: orderId } }),
    prisma.customer.findUnique({ where: { id: customerId } }),
  ]);

  if (!order) {
    throw new Error("Pedido no encontrado.");
  }
  if (!customer) {
    throw new Error("Cliente no encontrado.");
  }

  if (order.status === OrderStatus.ANULADO) {
    throw new Error("El pedido está anulado.");
  }

  if (
    order.status !== OrderStatus.RECIBIDO &&
    order.status !== OrderStatus.ACEPTADO &&
    order.status !== OrderStatus.ENTREGADO
  ) {
    throw new Error("No se puede registrar el pago de este pedido.");
  }

  if (order.paidAt) {
    throw new Error("Este pedido ya fue cobrado.");
  }

  const total = order.total;
  const pensionType: PensionTypeType = customer.pensionType;
  let nextBalance: number;

  if (pensionType === PensionType.PREPAGO) {
    if (customer.balance < total) {
      throw new Error(
        `Saldo insuficiente: ${customer.name} tiene ${formatPrice(customer.balance)} y el pedido cuesta ${formatPrice(total)}. Pide una recarga de ${formatPrice(total - customer.balance)} en Administración.`,
      );
    }
    nextBalance = customer.balance - total;
  } else {
    nextBalance = customer.balance - total;
    if (customer.creditLimit > 0 && nextBalance < -customer.creditLimit) {
      throw new Error(
        `La deuda de ${customer.name} superaría el límite de ${formatPrice(customer.creditLimit)} (quedaría en ${formatPrice(Math.abs(nextBalance))}).`,
      );
    }
  }

  // El pedido ya cobrado o el usuario de la sesión pueden no existir en la DB;
  // verificamos antes de asignar la llave foránea para no violar P2003.
  let userId = order.userId;
  if (!userId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });
    userId = dbUser ? dbUser.id : null;
  }

  // Transacción: descuenta el saldo, registra el consumo y cobra la orden.
  await prisma.$transaction([
    prisma.customer.update({
      where: { id: customerId },
      data: { balance: nextBalance },
    }),
    prisma.customerLedger.create({
      data: {
        customerId,
        type: "CONSUMO",
        amount: total,
        orderId: order.id,
      },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: {
        // Un pedido en RECIBIDO (web/store) se acepta al cobrarlo; los que ya
        // están ACEPTADO o ENTREGADO conservan su estado (el cobro es aparte).
        ...(order.status === OrderStatus.RECIBIDO
          ? { status: OrderStatus.ACEPTADO }
          : {}),
        paymentMethod: PaymentMethod.PENSION,
        paidAt: new Date(),
        userId,
        customerId,
      },
    }),
  ]);

  revalidatePath("/");
}

/** Marca un pedido ACEPTADO como ENTREGADO. La entrega es independiente del
 *  cobro: el cliente puede pagar después, incluso tras la entrega. */
export async function deliverOrder(orderId: string) {
  const session = await getRequiredSession();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error("Pedido no encontrado.");
  }

  if (order.status === OrderStatus.ANULADO) {
    throw new Error("El pedido está anulado.");
  }

  if (order.status !== OrderStatus.ACEPTADO) {
    throw new Error("El pedido ya fue entregado.");
  }

  // El pedido o el usuario de la sesión pueden no existir en la DB; verificamos
  // antes de asignar la llave foránea para no violar la restricción (P2003).
  let userId = order.userId;
  if (!userId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });
    userId = dbUser ? dbUser.id : null;
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.ENTREGADO,
      // El momento de entrega se registra una sola vez.
      deliveredAt: order.deliveredAt ?? new Date(),
      userId,
    },
  });

  revalidatePath("/");
}
