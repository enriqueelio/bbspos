## 1. Moneda 0,50 y migración CashClose

- [x] 1.1 Agregar `0.5` a `CashDenominations` en `packages/types/src/index.ts`
- [x] 1.2 Escribir migración `20260911140000_cash_close_money_float` (recrear CashClose con columnas REAL + índices) y aplicar con `prisma migrate deploy`
- [x] 1.3 Regenerar cliente Prisma (matar procesos Node primero por EPERM)

## 2. Arqueo tipo Excel en cash-close-view

- [x] 2.1 Tabla sticky con `cva` `arqueoRow` (zebra, focus-within, filas emerald si cantidad > 0)
- [x] 2.2 Navegación por teclado (↓/Enter avanza, ↑ retrocede) con `inputRefs`
- [x] 2.3 Autofocus en denominación Bs 200 al montar
- [x] 2.4 Formato `fmtBs` con 2 decimales solo cuando hay fracción (0,50)
- [x] 2.5 Total contado en vivo en el `tfoot`

## 3. Cola: orden e iconos

- [x] 3.1 Pedidos completados (entregados pagados y anulados) después de los pendientes
- [x] 3.2 `DELIVERY_ICONS` map (Bike celeste / Utensils ámbar / PaperBag verde) con `title` tooltip
- [x] 3.3 `PAYMENT_ICONS` map (Banknote/QrCode/CreditCard/Users/PaperBag) con normalización `PENSION` → `PENSIONADO`
- [x] 3.4 Monto en un solo `<span>` con `formatPrice` — sin doble espacio
- [x] 3.5 Icono de pago solo en tarjeta expandida y fila compacta junto al monto
- [x] 3.6 Icono de entrega derecha en contraída y top-right en expandida compacta

## 4. Botón del terminal POS

- [x] 4.1 Eliminar fila `Total` del ticket en curso
- [x] 4.2 Texto del botón: "COMPLETAR PEDIDO" si total = 0, "ACEPTAR {total}" si billing, "Enviar a caja" si mesero
- [x] 4.3 `mt-2` en botón para compensar el gap eliminado

## 5. Verificación

- [x] 5.1 `typecheck` y `lint` en `@bbspos/types`, `@bbspos/db` y `@bbspos/cajero` verdes
- [x] 5.2 Servidor compilando en :3002, pestaña Cierre funcional, arqueo con moneda 0,50, cola con iconos
- [x] 5.3 Documentar change openspec y sincronizar specs canónicas
