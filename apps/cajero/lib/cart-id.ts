// Identidad de la caja para el apartado de cupo de los almuerzos.
//
// Vive en el navegador (localStorage) porque la crea el POS, pero el catálogo
// se arma en un server component que solo puede leer cookies. Por eso el mismo
// id se guarda en las dos partes: localStorage manda y la cookie es el espejo
// que usa el servidor para saber qué apartados son ajenos al leer los números.

/** Clave de localStorage. */
export const CART_ID_STORAGE_KEY = "bbspos-pos-cart-id";
/** Cookie espejo que lee el servidor. */
export const CART_ID_COOKIE = "bbspos_pos_cart_id";

/** Refleja el id de la caja en la cookie del servidor. */
export function mirrorCartIdCookie(cartId: string) {
  if (typeof document === "undefined" || !cartId) return;
  document.cookie = `${CART_ID_COOKIE}=${encodeURIComponent(cartId)}; path=/; max-age=31536000; samesite=lax`;
}
