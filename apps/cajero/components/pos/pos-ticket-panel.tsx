"use client";

import { useEffect, useState } from "react";
import {
  cartItemUnitTotal,
  formatPrice,
  MenuCategoryLabel,
  shortCustomerName,
  type CartItem,
  type CustomerLoyaltyView,
  type CustomerSuggestion,
} from "@bbspos/types";
import {
  getCustomerLoyalty,
  getCustomerSuggestions,
  registerCustomerAtPos,
} from "@/app/actions/customers";
import { holdLunchUnits, unholdLunchUnits } from "@/actions/lunch-stock";
import { usePosCart, type PosDeliveryType } from "./pos-cart-store";
import { PAY_BUTTON } from "./pos-styles";

function deliveryLabel(type: PosDeliveryType) {
  return type === "MESA" ? "MESA" : type === "LLEVAR" ? "LLEVAR" : "DELIVERY";
}

// ISO → valor local para <input type="datetime-local"> (YYYY-MM-DDTHH:mm).
function toLocalDateTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PosTicketPanel({
  cart,
  isBilling,
  busy,
  notice,
  error,
  needsName,
  needsDelivery,
  formOk,
  cartTotal,
  hasBuildingProduct,
  onClear,
  onSubmit,
  onNotice,
}: {
  cart: ReturnType<typeof usePosCart>;
  isBilling: boolean;
  busy: boolean;
  notice: string | null;
  error: string | null;
  needsName: boolean;
  needsDelivery: boolean;
  formOk: boolean;
  cartTotal: number;
  /** Hay un producto en construcción (sabor marcado en Bubas). */
  hasBuildingProduct: boolean;
  onClear: () => void;
  onSubmit: () => void;
  /** Muestra un aviso no bloqueante en el panel del ticket (lealtad, registro). */
  onNotice: (msg: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<CustomerSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLocked, setSuggestionsLocked] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regBusy, setRegBusy] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Los steppers de un almuerzo también mueven el cupo: subir aparta las
  // unidades para esta caja y bajar las suelta. Si al subir ya no hay
  // (porque otra caja se las llevó), la cantidad no cambia y se avisa, en vez de
  // dejar una línea que no se podría cobrar.
  async function changeQuantity(item: CartItem, next: number) {
    const target = Math.max(1, next);
    const delta = target - item.quantity;
    if (delta === 0) return;

    if (item.kind === "MENU_ITEM" && delta > 0) {
      try {
        // `scheduledFor` en null (o vacío) = venta de hoy: ahí sí se aparta. En
        // una reserva para otro día la acción no aparta nada y el cupo de esa
        // fecha se revisa al guardar.
        await holdLunchUnits(
          cart.cartId,
          item.menuItemId,
          delta,
          cart.scheduledFor || null,
        );
      } catch (e) {
        onNotice(
          e instanceof Error
            ? e.message
            : "Ya no hay unidades disponibles de ese almuerzo.",
        );
        return;
      }
    } else if (item.kind === "MENU_ITEM") {
      // Suelta el cupo aunque falle la llamada: quitar la línea nunca se bloquea
      // y, en el peor caso, el apartado se libera solo al vencer.
      try {
        await unholdLunchUnits(cart.cartId, item.menuItemId, -delta);
      } catch {
        // Sin efecto: el TTL limpia lo que quede.
      }
    }
    cart.updateQuantity(item.id, target);
  }

  async function removeLine(item: CartItem) {
    if (item.kind === "MENU_ITEM") {
      try {
        await unholdLunchUnits(cart.cartId, item.menuItemId, item.quantity);
      } catch {
        // Sin efecto: el TTL limpia lo que quede.
      }
    }
    cart.removeItem(item.id);
  }

  // Autocompletado de clientes (lealtad): busca coincidencias por nombre o
  // teléfono con debounce de 250 ms; si el cajero edita el texto, se quita el
  // cliente vinculado para no enviar un id que no corresponde al campo. Al
  // cambiar el texto NO se vuelve a buscar mientras haya un cliente vinculado
  // (el nombre corto que se muestra ya corresponde); al editar se desvincula y la
  // búsqueda se reactiva. `suggestionsLocked` congela la búsqueda: el cajero
  // presionó Enter para aceptar ese nombre como invitado sin vincular a nadie.
  useEffect(() => {
    if (cart.customerId || suggestionsLocked) return;
    setSuggestions([]);
    setShowSuggestions(false);
    const q = cart.customerName.trim();
    if (q === "") return;
    const timer = setTimeout(() => {
      getCustomerSuggestions(q)
        .then((matches) => {
          setSuggestions(matches);
          setShowSuggestions(matches.length > 0);
        })
        .catch(() => {
          setSuggestions([]);
          setShowSuggestions(false);
        });
    }, 250);
    return () => clearTimeout(timer);
    // El id cambia junto con el nombre al elegir o vincular un cliente; se
    // incluye para cortar la búsqueda en el momento exacto.
  }, [cart.customerName, suggestionsLocked, cart.customerId]);

  // Alerta no bloqueante cuando el cliente vinculado alcanza un nivel de
  // lealtad (se muestra como notice en el panel superior del ticket).
  function notifyLoyalty(loyalty: CustomerLoyaltyView | null) {
    if (!loyalty) return;
    if (loyalty.levelName) {
      onNotice(
        `${loyalty.name} · Nivel ${loyalty.levelName} · ${loyalty.points} pts`,
      );
    } else {
      onNotice(`${loyalty.name} · ${loyalty.points} pts`);
    }
  }

  async function selectCustomer(candidate: CustomerSuggestion) {
    cart.setCustomerName(shortCustomerName(candidate).toUpperCase());
    cart.setCustomerId(candidate.id);
    setSuggestions([]);
    setShowSuggestions(false);
    try {
      notifyLoyalty(await getCustomerLoyalty(candidate.id));
    } catch {
      // La alerta de nivel no debe bloquear la selección del cliente.
    }
  }

  // Activa/desactiva la reserva del ticket con el icono de calendario: al
  // activarla fija por defecto la hora pactada a +30 min y despliega los campos
  // (fecha/hora y aviso). Al desactivarla vuelve a ser un pedido inmediato.
  function toggleReservation() {
    if (cart.scheduledFor !== "") {
      cart.setScheduledFor("");
    } else {
      const d = new Date(Date.now() + 30 * 60_000);
      cart.setScheduledFor(d.toISOString());
    }
  }

  // Formulario "Registrar" junto al campo de nombre (solo roles que cobran):
  // crea el cliente explícitamente, lo vincula al pedido y muestra su nombre
  // corto.
  function openRegister() {
    setRegError(null);
    setRegName(cart.customerId ? "" : cart.customerName);
    setRegPhone("");
    setShowRegister(true);
  }

  async function registerCustomer() {
    const name = regName.trim().toUpperCase();
    if (!name) {
      setRegError("El nombre del cliente es obligatorio.");
      return;
    }
    if (cart.items.length === 0) {
      setRegError("Primero agrega productos al ticket.");
      return;
    }
    setRegBusy(true);
    setRegError(null);
    try {
      const loyalty = await registerCustomerAtPos({
        name,
        phone: regPhone.trim() ? regPhone : null,
      });
      cart.setCustomerName(shortCustomerName(loyalty).toUpperCase());
      cart.setCustomerId(loyalty.id);
      setShowRegister(false);
      setRegName("");
      setRegPhone("");
      notifyLoyalty(loyalty);
      onNotice(`Cliente ${loyalty.name} registrado y vinculado al pedido.`);
    } catch (e) {
      setRegError(e instanceof Error ? e.message : "No se pudo registrar.");
    } finally {
      setRegBusy(false);
    }
  }

  return (
    <section className="flex w-1/5 min-w-[280px] shrink-0 flex-col overflow-hidden border-r border-slate-800 bg-slate-900">
      {/* Encabezado del ticket */}
      <div className="shrink-0 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
        <h2 className="text-base font-black uppercase tracking-wide text-white">
          Ticket en curso
        </h2>
        <button
          type="button"
          onClick={onClear}
          disabled={
            busy ||
            (cart.items.length === 0 &&
              cart.customerName === "" &&
              !hasBuildingProduct)
          }
          title="Vaciar el pedido si el cliente se arrepiente"
          className="h-8 shrink-0 rounded-full border border-red-500/50 bg-red-500/10 px-3 text-xs font-semibold uppercase tracking-wide text-red-300 transition-all hover:border-red-500 hover:bg-red-500/20 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Limpiar
        </button>
      </div>

      {busy && (
        <p className="shrink-0 mx-4 mt-3 rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-300">
          Enviando… por favor espera.
        </p>
      )}
      {notice && (
        <p className="shrink-0 mx-4 mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          {notice}
        </p>
      )}
      {error && (
        <p className="shrink-0 mx-4 mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          ⚠ {error}
        </p>
      )}
      {isBilling && cart.editingOrderId && (
        <p className="shrink-0 mx-4 mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Editando reserva: al pulsar GUARDAR los cambios se aplican al mismo
          pedido en la cola (se mantiene la hora pactada).
        </p>
      )}

      {/* Cuerpo del ticket: ítems scrolleables */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cart.items.length === 0 && (
          <p className="text-sm text-slate-500">
            Agrega bebidas tocando un sabor o un plato del día en el catálogo.
          </p>
        )}
        {cart.items.map((item) => {
          const unitWithExtras = cartItemUnitTotal(item);
          return (
            <div
              key={item.id}
              className="flex items-start justify-between gap-2 rounded-md bg-slate-800 px-3 py-2"
            >
              <div className="min-w-0 text-sm">
                <p className="font-semibold capitalize text-white">
                  {item.quantity}× {item.kind === "DRINK" ? item.flavor.name : item.name}
                </p>
                <p className="text-slate-400">
                  {item.kind === "DRINK" ? (
                    `${item.size.name} · ${item.bobaType.name}`
                  ) : (
                    <>
                      {MenuCategoryLabel[item.category]}
                      {item.optionName && (
                        <span className="ml-1 font-semibold text-white">
                          · {item.optionName}
                        </span>
                      )}
                    </>
                  )}
                </p>
                {item.kind === "MENU_ITEM" && item.detail && (
                  <p className="text-xs font-semibold text-emerald-300">
                    {item.detail}
                  </p>
                )}
                {item.kind === "DRINK" && item.toppings.length > 0 && (
                  <p className="text-slate-400">
                    + {item.toppings.map((t) => t.name).join(", ")}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Restar cantidad"
                    className="h-8 w-8 rounded-lg bg-slate-700 text-white text-lg font-bold flex items-center justify-center active:scale-90 transition-all hover:bg-slate-600"
                    onClick={() => changeQuantity(item, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span className="text-base font-bold w-6 text-center text-slate-200">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Sumar cantidad"
                    className="h-8 w-8 rounded-lg bg-slate-700 text-white text-lg font-bold flex items-center justify-center active:scale-90 transition-all hover:bg-slate-600"
                    onClick={() => changeQuantity(item, item.quantity + 1)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    aria-label="Quitar ítem del ticket"
                    className="h-8 px-3 rounded-lg bg-red-600/90 text-white text-xs font-bold uppercase tracking-wide transition-all active:scale-95 hover:bg-red-500"
                    onClick={() => removeLine(item)}
                  >
                    Quitar
                  </button>
                </div>
              </div>
              <span className="font-mono text-sm font-bold text-white whitespace-nowrap">
                {formatPrice(unitWithExtras * item.quantity)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Área de pago fija al fondo del panel izquierdo */}
      <div className="shrink-0 px-4 py-3 bg-slate-950 border-t border-slate-800 flex flex-col gap-2">
        <div className="relative">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={cart.customerName}
              onChange={(e) => {
                cart.setCustomerName(e.target.value.toUpperCase());
                // El texto cambió: el cliente vinculado ya no corresponde.
                cart.setCustomerId(null);
                setSuggestionsLocked(false);
                setShowSuggestions(false);
              }}
              onKeyDown={(e) => {
                // Enter acepta el nombre tal cual (invitado, sin vincular)
                // y cierra el dropdown para que no reaparezca.
                if (e.key === "Enter") {
                  e.preventDefault();
                  setSuggestionsLocked(true);
                  setSuggestions([]);
                  setShowSuggestions(false);
                }
              }}
              placeholder="NOMBRE"
              className={`h-10 w-full rounded-xl border bg-slate-800 px-3 text-sm font-medium uppercase placeholder:text-slate-500 focus:outline-none transition-shadow ${
                needsName
                  ? "border-amber-400/70 animate-name-glow text-white"
                  : cart.customerId
                    ? "border-amber-400/90 text-amber-300 font-bold"
                    : "border-slate-700 text-white focus:border-primary"
              }`}
            />
            {isBilling && (
              <button
                type="button"
                onClick={openRegister}
                title="Registrar un cliente nuevo y vincularlo al pedido"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 transition-all hover:border-emerald-400 hover:bg-emerald-500/20 active:scale-95"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-user-plus h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" x2="19" y1="8" y2="14" />
                  <line x1="22" x2="16" y1="11" y2="11" />
                </svg>
              </button>
            )}
            {isBilling && (
              <button
                type="button"
                onClick={toggleReservation}
                title={
                  cart.scheduledFor !== ""
                    ? "Quitar la reserva (pedido inmediato)"
                    : "Hacer reserva: fija la hora pactada y el aviso"
                }
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all active:scale-95 ${
                  cart.scheduledFor !== ""
                    ? "border-purple-400 bg-purple-500/25 text-purple-200"
                    : "border-slate-700 bg-slate-800 text-slate-400 hover:border-purple-400/70 hover:text-purple-200"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-calendar-fold h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M16 2v3" />
                  <path d="M21 15V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h10v-5a1 1 0 011-1za2.4 2.4 0 01-.706 1.706l-3.588 3.588A2.4 2.4 0 0115 21" />
                  <path d="M3 9h18" />
                  <path d="M8 2v3" />
                </svg>
              </button>
            )}
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <>
              {/* Clic fuera cierra el dropdown */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowSuggestions(false)}
              />
              <ul className="absolute left-0 right-0 top-11 z-20 max-h-56 overflow-y-auto rounded-xl border border-slate-600 bg-slate-800 py-1 shadow-xl">
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => selectCustomer(s)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-slate-200 transition-colors hover:bg-slate-700"
                    >
                      <span className="truncate font-semibold uppercase">
                        {s.name}
                      </span>
                      {s.phone && (
                        <span className="shrink-0 font-mono text-slate-400">
                          {s.phone}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Selector de destino (solo cajero/admin): el mesero siempre envía a MESA. */}
        {isBilling && (
          <div
            className={`grid grid-cols-3 gap-2 rounded-xl ${
              needsDelivery ? "animate-name-glow" : ""
            }`}
          >
            {(["MESA", "LLEVAR", "DELIVERY"] as PosDeliveryType[]).map(
              (type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => cart.setDeliveryType(type)}
                  className={`${PAY_BUTTON} ${
                    cart.deliveryType === type
                      ? "border-blue-500 bg-blue-500 text-white shadow-md shadow-blue-500/25"
                      : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-primary/60 hover:bg-slate-800"
                  }`}
                >
                  {deliveryLabel(type)}
                </button>
              ),
            )}
          </div>
        )}

        <input
          type="text"
          value={cart.notes}
          onChange={(e) => cart.setNotes(e.target.value.toUpperCase())}
          placeholder="INDICACIONES"
          title="Notas del cliente para el pedido (ej. sin cebolla, poco picante)"
          className="h-9 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 text-sm uppercase text-slate-200 placeholder:text-slate-500 focus:border-amber-400/70 focus:outline-none transition-shadow"
        />

        {/* Reserva: hora pactada + minutos antes para avisar (solo cajero/
            admin). Se despliega con el icono de calendario junto al de
            registrar. La reserva NO imprime comanda al crearse; entra en la
            cola como reserva y se confirma (cobro + comanda) en su momento. */}
        {isBilling && cart.scheduledFor !== "" && (
          <div className="space-y-2 rounded-xl border border-purple-500/40 bg-purple-500/5 p-2">
            <input
              type="datetime-local"
              value={toLocalDateTime(cart.scheduledFor)}
              onChange={(e) => {
                if (e.target.value) {
                  cart.setScheduledFor(new Date(e.target.value).toISOString());
                }
              }}
              className="h-9 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 text-sm text-slate-200 focus:border-purple-400/70 focus:outline-none transition-shadow"
            />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Avisar
              </span>
              <input
                type="number"
                min={1}
                value={cart.reserveLeadMin}
                onChange={(e) =>
                  cart.setReserveLeadMin(Number(e.target.value))
                }
                className="h-8 w-16 rounded-lg border border-slate-700 bg-slate-800 px-2 text-center text-sm font-bold text-slate-200 focus:border-purple-400/70 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500">
                min antes (en la cola)
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={busy || !formOk}
          onClick={onSubmit}
          className={`mt-2 w-full h-12 text-base font-bold capitalize text-white rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 ${
            isBilling
              ? "bg-gradient-to-b from-blue-500 to-blue-600 shadow-blue-950/40 hover:from-blue-400 hover:to-blue-600"
              : "bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700"
          }`}
        >
          {busy ? (
            cart.editingOrderId ? "Guardando…" : "Enviando…"
          ) : cartTotal === 0 ? (
            "COMPLETAR PEDIDO"
          ) : isBilling && cart.editingOrderId ? (
            <>
              <span className="text-base font-bold">GUARDAR</span>
              <span className="font-mono text-lg font-bold">
                {formatPrice(cartTotal)}
              </span>
            </>
          ) : isBilling ? (
            <>
              <span className="text-base font-bold">ACEPTAR</span>
              <span className="font-mono text-lg font-bold">
                {formatPrice(cartTotal)}
              </span>
            </>
          ) : (
            "Enviar a caja"
          )}
        </button>
      </div>

      {/* Diálogo "Registrar cliente" (básico: nombre obligatorio + teléfono
          opcional). Se asume el rol de cajero/admin, que es el único que ve
          el acceso. */}
      {showRegister && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-600 bg-slate-900 p-4 shadow-2xl">
            <h3 className="text-base font-black uppercase tracking-wide text-white">
              Registrar cliente
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Se crea en la base de clientes, se vincula a este pedido y se
              identifica con su primer nombre y apellido paterno.
            </p>
            <div className="mt-3 space-y-2">
              <input
                type="text"
                value={regName}
                onChange={(e) => {
                  setRegName(e.target.value.toUpperCase());
                  setRegError(null);
                }}
                placeholder="NOMBRE (obligatorio)"
                autoFocus
                className="h-11 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 text-sm font-medium uppercase text-white placeholder:text-slate-500 focus:border-emerald-400/70 focus:outline-none"
              />
              <input
                type="text"
                value={regPhone}
                onChange={(e) => {
                  setRegPhone(e.target.value);
                  setRegError(null);
                }}
                placeholder="TELÉFONO (opcional)"
                className="h-11 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 text-sm font-medium uppercase text-white placeholder:text-slate-500 focus:border-emerald-400/70 focus:outline-none"
              />
              {regError && (
                <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  ⚠ {regError}
                </p>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowRegister(false)}
                disabled={regBusy}
                className="h-11 rounded-xl border border-slate-700 bg-slate-800 text-sm font-bold uppercase tracking-wide text-slate-300 transition-all hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={registerCustomer}
                disabled={regBusy}
                className="h-11 rounded-xl border border-emerald-500 bg-emerald-600 text-sm font-bold uppercase tracking-wide text-white transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {regBusy ? "Registrando…" : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}