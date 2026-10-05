# Especificaciones Técnicas — Refactor Módulo Clientes, Pensionados y Lealtad

Fecha: 2026-10-05  
Commit: (a crear)

---

## Resumen de Cambios (5 Fases)

### Phase 1: Infraestructura Compartida
**Archivos nuevos:**
- `packages/db/src/loyalty.ts` — `levelNameOf()` y `validatePensionadoBalance()` exportados desde `@bbspos/db`
- `packages/db/src/index.ts` — exporta `loyalty`
- `packages/ui/src/components/ui/tabs.tsx` — primitivo `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `apps/admin/components/shared/`:
  - `Modal.tsx` — modal reutilizable (reemplaza duplicados)
  - `runAction.ts` — helper de error handling
  - `BalanceCell.tsx` — `BalanceCell` + `BalanceInline`
  - `FundDialog.tsx` — diálogo recargar/pagar deuda
  - `LedgerDialog.tsx` — diálogo movimientos ledger
  - `UnmarkDialog.tsx` — diálogo desmarcar pensionado
  - `index.ts` — barrel export

**Archivos modificados:**
- `packages/db/package.json` — añade dependencia `@bbspos/types`
- `apps/cajero/app/actions/customers.ts` — importa `levelNameOf` desde `@bbspos/db`, elimina definición local
- `apps/admin/app/actions/customers.ts` — usa `levelNameOf` desde `@bbspos/db`

---

### Phase 2: `/customers` — Directorio Unificado
**Archivos modificados:**
- `apps/admin/app/(dashboard)/customers/page.tsx`:
  - Elimina `where: { account: null }`
  - Incluye `account: { select: { pensionType, balance, creditLimit } }`
  - Tipo `ClientCustomer` extendido con `pensionType`, `balance`, `creditLimit`
- `apps/admin/app/(dashboard)/customers/customers-client.tsx`:
  - Tabla limpia: Nombre, CI, Teléfono, Estado (badge), Saldo, Acciones
  - Filter chips: `[Todos] [Normales] [Pensionados] [Deudores]` con contadores
  - Buscador reactivo (nombre, CI, teléfono)
  - Modal "Activar cuenta pensionada" con `Tabs`:
    - Tab Configuración: modalidad PREPAGO/POSTPAGO, límite crédito
    - Tab Saldo inicial: monto + medio de pago (EFECTIVO/QR)
  - `convertToPensionado` recibe `initialBalance` + `paymentMethod` y crea ledger inicial
  - Badge estado: `Normal` (gris) / `Pensionado · Prepago` (verde) / `Pensionado · Postpago` (naranja)
  - Saldo condicional: `—` si normal, verde si >0, rojo si <0

---

### Phase 3: Ficha del Cliente (CustomerDetailModal)
**En `customers-client.tsx` (modal embebido):**
- Se abre con botón "Ver ficha" (ojo + loader)
- 4 tabs: **Resumen**, **Cuenta**, **Historial**, **Lealtad**

**Resumen:**
- Identidad (nombre, CI, teléfono, fecha alta)
- Estado con badge
- Cuenta resumen: modalidad, saldo, límite + botones acción

**Cuenta (solo si tiene account):**
- Modalidad, saldo, límite en cards
- Movimientos (últimos 50) con tipo, fecha, método, monto (+/- color)
- Botones: Recargar/Pagar, Ver movimientos, Configurar cuenta, Desmarcar (solo si saldo=0)

**Historial:**
- Tabla pedidos recientes (entregados y cobrados): ticket, fecha, total, método

**Lealtad:**
- 4 métricas grandes: visitas, gasto, puntos, última visita
- Aviso especial para Postpago: "consumos a cuenta no generan lealtad"

**Reutiliza componentes compartidos:** `FundDialog`, `LedgerDialog`, `UnmarkDialog`, `EditAccountDialog` (local)

---

### Phase 4: `/pensionados` — Panel Financiero
**Archivos modificados:**
- `apps/admin/app/(dashboard)/pensionados/page.tsx`:
  - Título: "Cuentas Pensionadas"
  - Calcula KPIs: `totalSaldoAFavor` (Prepago >0), `totalDeudaPorCobrar` (Postpago <0)
  - Pasa `kpis` + `customers` al cliente
- `apps/admin/app/(dashboard)/pensionados/pensionados-client.tsx` (reescrito):
  - KPIs cards arriba
  - Tabla: Cliente, Modalidad, Saldo/Deuda, Límite, Acciones
  - Sin CI, teléfono, botón Editar, "Nuevo pensionado"
  - Acciones: Recargar/Pagar, Movimientos, Configurar cuenta, Desmarcar (solo admin, solo saldo=0)
  - Reutiliza `FundDialog`, `LedgerDialog`, `UnmarkDialog`, `BalanceCell`
  - `EditAccountDialog` local para cambiar modalidad/límite

---

### Phase 5: `/customers-ranking` — Ranking y Canjes
**Archivos modificados:**
- `apps/admin/app/actions/loyalty.ts`:
  - `getCustomerRanking(periodo, search, sortBy?)` — `sortBy: "gasto" | "visitas"`
  - `listCustomerRewards(customerId)` — lee `CustomerReward` (últimos 50)
- `apps/admin/app/(dashboard)/customers-ranking/page.tsx`:
  - Pasa `sortBy` desde searchParams
- `apps/admin/app/(dashboard)/customers-ranking/customers-ranking-client.tsx`:
  - Selector "Ordenar: Gasto | Visitas" junto a períodos
  - Columna "Visitas (periodo)" respetan el orden
  - Botón "Ver canjes" por fila → Dialog con historial `CustomerReward`
  - Dialog canjes: tipo, descripción, regla, ticket, fecha, puntos (-)

---

## Cambios en Base de Datos (Acciones)
- `convertToPensionado`: acepta `initialBalance` + `paymentMethod`, crea `CustomerAccount` + `CustomerLedger` inicial (RECARGA/PAGO_DEUDA) en transacción
- `addCustomerFunds`: `revalidatePath("/customers")` + `/pensionados`
- `updatePensionadoAccount`: `revalidatePath("/customers")` + `/pensionados`

---

## Invariantes Preservadas
1. `CustomerAccount` = única fuente de verdad financiera
2. `balance = Σ(RECARGA + PAGO_DEUDA) − Σ(CONSUMO)` verificado por scripts
3. Lealtad: solo pedidos fidelizables (`isFidelizable` / `fidelizableOrderWhere`)
4. Postpago + PENSION no suma visitas/gasto/puntos/nivel
5. Cierre de caja: recargas/pagos deuda = ingreso real; consumos a cuenta = NO ingreso
6. Cajero: autocomplete busca TODOS los clientes; selector pensionados filtra `account != null`
7. `phone` único en `Customer` (llave operativa POS)

---

## Testing Manual Recomendado
1. `/customers` — crear cliente normal, verificar aparece en lista
2. `/customers` — "Activar cuenta pensionada" PREPAGO con saldo inicial 100 Bs EFECTIVO → verifica badge verde, saldo 100, ledger tiene RECARGA 100
3. `/customers` — "Activar cuenta pensionada" POSTPAGO límite 500 → badge naranja, límite 500
4. `/customers` — "Ver ficha" → tabs navegan, datos correctos
5. `/pensionados` — KPIs coinciden con suma de saldos
6. `/pensionados` — "Recargar Saldo" / "Pagar Deuda" → actualiza saldo + ledger + `/customers` refresh
7. `/customers-ranking` — toggle "Gasto" / "Visitas" reordena tabla
8. `/customers-ranking` — "Ver canjes" muestra historial si existe
9. Cajero — cobro a cuenta pensionado valida saldo/límite correctamente
10. Scripts DB: `verify:cuenta`, `verify:customer-account`, `fix:postpago-loyalty` pasan