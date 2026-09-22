# Informe de trabajo — Bubble Tea POS (bbspos)

**Fecha:** 2026-09-22
**Rama:** `master` · **Últimos commits:** `94e045c` (control creación clientes), `90e1f8d` (clientes leales), ambos pusheados a `origin`.

---

## 1. Contexto del proyecto

Monorepo pnpm `bbspos`: POS de té (Bubble Tea) con apps Next.js:

- `apps/admin` (puerto 3001): gestión de clientes, ranking de lealtad, inventario, cierres.
- `apps/cajero` (puerto 3002): terminal de venta + cola de pedidos.
- `apps/mesero`, `apps/store`: sin cambios en este trabajo.

Paquetes: `packages/db` (Prisma + SQLite), `packages/types`, `packages/ui`, `packages/config`.

Convenciones relevantes:
- Migraciones Prisma escritas a mano y aplicadas con `prisma migrate deploy` (NO `migrate dev`).
- Zona horaria fija `America/La_Paz` (UTC-4). `createdAt`/`paidAt` se guardan como enteros/ISO en UTC; `daySeq` es el número de ticket diario visible.
- Estados de pedido en BD: `RECIBIDO`, `ACEPTADO`, `ENTREGADO`, `ANULADO`. Cobrado = `paidAt`, entregado = `deliveredAt`.

---

## 2. Qué se hizo

### A. Programa de clientes leales (commit `90e1f8d`)

1. **Modelo de datos:**
   - `Customer` ganó: `totalVisits`, `totalSpent`, `points`, `lastVisitAt`, `createdAt`.
   - Nuevo modelo `CustomerBenefitRule` (reglas de niveles) y tablas de canjes/recompensas.
   - `Order` ganó `customerId` opcional + `canceledBy`/`discountedBy` y restricción de registro doble en cierre de caja.
   - Migración SQL a mano + backfill; `prisma migrate deploy` y `prisma generate`.

2. **Lógica de lealtad (cajero):**
   - Al **cobrar** un pedido (`acceptOrder`/`acceptPensionOrder`, misma transacción que registra `paidAt`): +1 visita, +total gastado, +total en puntos (1 Bs = 1 punto) y última visita. Solo se dispara si hay `customerId`; invitados no acumulan.
   - Latencia de la transacción resuelta: el callback de cobro espera toda la secuencia (lealtad + resto) para evitar cierres de caja intermedios.

3. **Autocompletado de clientes en el terminal:**
   - `getCustomerSuggestions`: debounce, búsqueda `contains` por `name`/`phone`, tope 8, orden por última visita.
   - Al seleccionar: fija `customerId`, muestra nombre corto y **resalta el campo en dorado**.

4. **Ranking y canjes (Admin):**
   - Página de ranking de clientes frecuentes (`/customers-ranking`) con periodo (mes / 30 días / total) y reglas de niveles activas.
   - Visto en pantalla: Ronald 6 visitas / 290 Bs, María 2 / 95 Bs, ANDRES 1 / 45 Bs (mes).

### B. Control de creación de clientes (commit `94e045c`)

**Problema original:** `upsertCustomerForOrder` creaba un cliente en BD por cada nombre rápido tecleado en el cobro → decenas de duplicados ("MARIA", "ANDRES"…), ensuciaban ranking/lealtad y no se sabía cuál era el real.

1. **Cambio de filosofía en el terminal:**
   - **Venta invitado por defecto**: escribir un nombre/mesa y cobrar crea la orden con `customerName` pero SIN crear ni vincular `Customer` (`customerId: null`). Igual de obligatorio el nombre.
   - **Vincular, no crear**: `upsertCustomerForOrder` se reemplazó por `linkCustomerByText(text)` que vincula por `phone` exacto o `name` exacto (comparación en MAYÚSCULAS), devuelve `CustomerLoyaltyView | null` y **nunca crea**. Sin coincidencia → invitado.
   - **Registro explícito desde el terminal**: botón "Registrar" junto al campo NOMBRE (solo roles que cobran, no meseros) → diálogo básico (nombre + teléfono opcional) → `registerCustomerAtPos`: valida rol, nombre obligatorio, teléfono normalizado, rechaza duplicado con error claro (`El teléfono X ya está registrado para <cliente>.`), crea y vincula el pedido actual.

2. **Nombre corto (decisión de diseño discutida con el usuario):**
   - Plan original: campo `nickname`/apodo en `Customer` (auto = primer nombre, editable en Admin).
   - **Se descartó a mitad de implementación**: había duplicados históricos (2 "Ronald", 5 "Maria") que volvían el apodo ambiguo/confuso.
   - **Decisión final**: NO hay campo en BD. El nombre corto es **derivado** = primer nombre + apellido paterno (`"MARIA FERNANDEZ LOPEZ"` → `"MARIA FERNANDEZ"`; una sola palabra se usa completa). Helper client-safe `shortCustomerName` en `@bbspos/types` (los módulos `"use server"` solo exportan funciones async).
   - La BD conserva únicamente el nombre completo; cola y comanda imprimen `order.customerName` sin cambios de código.

3. **Refuerzos de UX pedidos por el usuario:**
   - Enter en el campo NOMBRE → acepta el texto como invitado sin vincular y **congela el dropdown** (estado `suggestionsLocked`; se reactiva al seguir editando).
   - Fix: el dropdown ya no reaparece después de seleccionar un cliente (el effect limpia y corta si `customerId` ya está fijado).
   - Campo NOMBRE dorado cuando hay cliente vinculado; tarjetas de la cola muestran el nombre en dorado si el pedido está vinculado a un cliente (`order.customerId`).

4. **Schema final: sin cambios.**
   - Se crearon las migraciones transitorias `20260922110000_customer_nickname` (add + backfill) y `20260922120000_drop_customer_nickname` (drop) y se aplicaron en orden durante el desarrollo para ensayar y luego revertir limpio. El estado final del esquema y de la BD es idéntico al previo a este trabajo.
   - Los clientes ya existentes quedaron intactos (Ronald / 70094966, ANDRES sin teléfono, MARIA FERNANDEZ LOPEZ / 70012345).

---

## 3. Cómo quedó (estado actual probado)

- **Typecheck y lint**: `pnpm -r typecheck` y `pnpm -r lint` verdes (0 errores; warnings preexistentes de hooks/exhaustive-deps y `img` en admin).
- Validación de cambios OpenSpec: 2 passed (lealtad + control de clientes).
- Flujo verificado en pantalla por el usuario (cajero 3002 y admin 3001):
  - Venta invitado sin crear cliente en BD ✓
  - Vínculo por autocompletado y por teléfono ✓
  - Registro explícito + teléfono duplicado rechazado ✓
  - Enter → invitado y dropdown se cierra ✓
  - Nombre corto (primer nombre + apellido paterno) en ticket/cola ✓
  - Campo dorado en input y cola cuando hay vínculo ✓
  - Sin campo apodo en Admin ✓
  - Lealtad solo acumula en pedidos vinculados (verificado en BD: María 4 visitas/150 pts en el cierre de la sesión) ✓

---

## 4. Riesgos y puntos abiertos para análisis

1. **Clientes duplicados históricos** (varios "MARIA", "ANDRES", "Ronald") siguen existiendo en BD. El terminal los lista todos; la decisión de limpiarlos/depurarlos (merge, inactivar, purgar) queda abierta. No se tocaron.
2. **Aclaración de datos:** `/customers` (Admin) muestra **saldo**, no gasto acumulado. El gasto solo se ve en `/customers-ranking`. Esto generó confusión durante la prueba.
3. **Regla de puntos:** 1 Bs = 1 punto actualmente. Reglas de niveles/config en `CustomerBenefitRule` (activas). No se validó matemática de niveles en profundidad en esta sesión.
4. **Nombre corto derivado puede repetirse** (dos "MARIA FERNANDEZ"): la cola no es identificación unívoca; la ficha (id) y el vínculo sí lo son.
5. **Cierres de caja vs. lealtad:** se mitigó la latencia del cobro, pero vale revisar que un cierre en curso nunca pierda la acumulación de lealtad.
6. **`dev.db` está trackeado en git** (pese a existir .gitignore): cada corrida local ensucia el diff de la BD; vale decidir si se saca del repo o se actualiza con un seed.
7. **Tarea pendiente (planificada para mañana):** refactorizar `apps/admin/app/(dashboard)/orders/orders-client.tsx` para usar CVA, igual que la cola del cajero (`apps/cajero/components/orders/statusVariants.ts`), centralizando colores de los 5 estados del pedido.

---

## 5. Preguntas que me gustaría que las IAs respondieran

1. ¿Cómo recomiendan resolver la **depuración/unificación de clientes duplicados** sin perder su historial de lealtad y sin romper pedidos pasados? (¿merge automático por teléfono/CI, tabla de alias, migración de `order.customerId`?)
2. ¿`1 Bs = 1 punto` es el mejor modelo de acumulación para un bar de té, o conviene multiplicadores por monto/frecuencia? ¿Cómo calibrar las reglas de niveles con los datos reales?
3. ¿Conviene que el nombre corto derivado (primer nombre + apellido paterno) sea **configurable** (p. ej. etiqueta de ticket, tolerancia a tildes/acentos, nombres compuestos tipo "MARIA JOSE")?
4. ¿Riesgos de seguridad/sesiones con crear clientes desde el terminal con rol distinto a MESERO? ¿Conviene limitar a cajero/superadmin?
5. ¿Cómo evaluar el impacto comercial: los clientes vinculados (fidelizados) gastan más que los invitados? ¿Qué reportes/KPI sugieren.
6. ¿Es correcto mantener `dev.db` commiteada en el repo? Pros/contras y alternativa (seed + migración de referencia).