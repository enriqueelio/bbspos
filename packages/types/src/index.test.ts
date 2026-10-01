import { describe, expect, it } from "vitest";
import {
  fidelizableCustomerWhere,
  fidelizableOrderWhere,
  isFidelizable,
  PaymentMethod,
  PensionType,
} from "./index";

const MOSTRADOR = { isPension: false, pensionType: PensionType.PREPAGO };
const PREPAGO = { isPension: true, pensionType: PensionType.PREPAGO };
const POSTPAGO = { isPension: true, pensionType: PensionType.POSTPAGO };

describe("isFidelizable", () => {
  it("fideliza a un cliente de mostrador con cualquier metodo", () => {
    for (const metodo of [
      PaymentMethod.EFECTIVO,
      PaymentMethod.QR,
      PaymentMethod.TARJETA,
      PaymentMethod.PENSION,
    ]) {
      expect(isFidelizable(MOSTRADOR, metodo)).toBe(true);
    }
  });

  it("fideliza a un pensionado PREPAGO que consume su saldo", () => {
    expect(isFidelizable(PREPAGO, PaymentMethod.PENSION)).toBe(true);
    expect(isFidelizable(PREPAGO, PaymentMethod.EFECTIVO)).toBe(true);
  });

  it("NO fideliza el consumo a cuenta de un pensionado POSTPAGO", () => {
    expect(isFidelizable(POSTPAGO, PaymentMethod.PENSION)).toBe(false);
  });

  it("fideliza al POSTPAGO que compra pagando en efectivo o QR", () => {
    expect(isFidelizable(POSTPAGO, PaymentMethod.EFECTIVO)).toBe(true);
    expect(isFidelizable(POSTPAGO, PaymentMethod.QR)).toBe(true);
    expect(isFidelizable(POSTPAGO, PaymentMethod.TARJETA)).toBe(true);
  });

  it("no fideliza al POSTPAGO si el metodo es desconocido o no vino", () => {
    // Sin metodo no se puede afirmar que pago de verdad, asi que no puntua.
    expect(isFidelizable(POSTPAGO)).toBe(false);
    expect(isFidelizable(POSTPAGO, null)).toBe(false);
  });

  it("fideliza a un pensionado sin modalidad definida", () => {
    expect(isFidelizable({ isPension: true }, PaymentMethod.PENSION)).toBe(true);
  });
});

describe("fidelizableCustomerWhere", () => {
  it("marca al pensionado POSTPAGO como el unico excluido", () => {
    expect(fidelizableCustomerWhere()).toEqual({
      NOT: { isPension: true, pensionType: PensionType.POSTPAGO },
    });
  });
});

describe("fidelizableOrderWhere", () => {
  it("deja pasar a todo el que no es POSTPAGO, o si pago fuera de la cuenta", () => {
    expect(fidelizableOrderWhere()).toEqual({
      OR: [
        {
          customer: {
            is: { NOT: { isPension: true, pensionType: PensionType.POSTPAGO } },
          },
        },
        { paymentMethod: { not: PaymentMethod.PENSION } },
      ],
    });
  });

  it("comparte el criterio de pensionType con el filtro de cliente", () => {
    const orden = fidelizableOrderWhere();
    const cliente = fidelizableCustomerWhere();
    expect(orden.OR[0].customer.is).toEqual(cliente);
  });
});
