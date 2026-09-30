# Tasks

> Regla de la fase: **un commit por sub-pieza**, nunca un commit único por fase completa. Cada tarea termina con su verificación explícita; una tarea sin verificar no está cerrada.

## 0. Línea base (previa, bloqueante)

- [ ] 0.1 Levantar Admin y Cajero (`scripts\dev-admin.bat`, `scripts\dev-cajero.bat`) y recorrer `docs/VERIFICACION-MANUAL-CAJAERO-ADMIN.md` completo; anotar todo lo que ya falle hoy, para no atribuirlo al refactor
- [ ] 0.2 Guardar evidencia de los flujos que hoy funcionan bien (capturas de las 6 pestañas de menú, cola, ticket, cierre de caja, los 11 reportes) — es contra esto contra lo que se compara el "después"
- [x] 0.3 Confirmar `pnpm -r typecheck` y `pnpm -r lint` verdes **antes** de tocar nada (línea base) — 2026-09-30: typecheck verde en los 8 proyectos; lint verde (0 errores, 9 warnings preexistentes: 4 en `apps/store`, 5 en `apps/admin`)

## 1. F1 · Costuras de `reports-client.tsx`

- [ ] 1.1 Crear `lib/report-config.ts` con `categoryLabel`, `REPORT_GROUPS`, `REPORT_TABS`, `todayStr`, `daysAgoStr`, `monthStartStr`, `RANGE_PRESETS`, `presetRange`, `pct`; verificar que el archivo nuevo no importa nada de React
- [ ] 1.2 Crear `components/` con `DataTable`, `KpiCard`, `EmptyState` (mover sin editar lógica)
- [ ] 1.3 Crear `views/` con las 11 vistas (`DashboardView`, `DailyView`, `SalesRangeView`, `PeakHoursView`, `CategorySalesView`, `TopProductsView`, `SlowMoversView`, `StaffPerformanceView`, `AdjustmentsView`, `PaymentsView`, `DayTotalView`); verificar `pnpm --filter @bbspos/admin typecheck`
- [ ] 1.4 Extraer el bloque de fetching del shell a `hooks/use-reports-data.ts`; verificar typecheck
- [ ] 1.5 Reducir `reports-client.tsx` a solo el shell y el árbol de pestañas; verificar que el archivo queda < 400 líneas
- [ ] 1.6 **Manual:** abrir los 11 reportes en pantalla y cambiar de pestaña varias veces; confirmar que cada uno carga sus datos y que el selector de rango (hoy / 7d / 30d / mes / personalizado) sigue funcionando

## 2. F1 · Costuras de `queue-view.tsx`

- [ ] 2.1 Crear `queue/use-queue-clock.ts` con `useQueueClock` + `horaCreacion`, `isReservation`, `horaReserva`, `minsToScheduled`, `inReservationWindow`; verificar typecheck
- [ ] 2.2 Crear `queue/delivery-type-menu.tsx` (`DELIVERY_ICONS`, `DeliveryTypeMenu`, `DeliveryTypeIcon`) y `queue/payment-method-icon.tsx` (`PAYMENT_ICONS`, `PaymentMethodIcon`)
- [ ] 2.3 Crear `queue/order-card.tsx` (`OrderCard`, `OrderCardItem`, `PaperBag`), `queue/charge-button.tsx`, `queue/items-list.tsx`, `queue/age-badge.tsx`, `queue/queue-group-accordion.tsx`, `queue/empty-queue.tsx`, `queue/confirm-dialog.tsx`
- [ ] 2.4 Reducir `queue-view.tsx` al orquestador; verificar que queda < 400 líneas y que ya no exporta componentes que estén definidos en sus módulos
- [ ] 2.5 **Manual:** encolar un pedido real y recorrer la cola completa (ver 4.1 del checklist): ver reserva, cambiar tipo de entrega, abrir el diálogo de cobro, cobrar, aceptar, entregar
- [ ] 2.6 **Manual:** dejar un pedido en pantalla y confirmar que la insignia de tiempo (minutos / retraso) sigue actualizándose sola cada pocos segundos

## 3. F2 · Romper `MenuManager` (el núcleo de la propuesta)

- [ ] 3.1 Crear `menu/components/` y mover `CollapsibleCard`, `SubSection`, `CategoryToggles`, `PriceMatrixEditor`, `MenuItemOptionsEditor`, `ProductImageField`, `MenuSection`; verificar typecheck
- [ ] 3.2 Crear `panels/almuerzos-panel.tsx` con su propio `almuerzoModal`, `almuerzoDraft`, `almuerzosQuery`
- [ ] 3.3 Crear `panels/carta-panel.tsx` con `cartaModal`, `cartaDraft`, `cartaQuery`
- [ ] 3.4 Crear `panels/bebidas-panel.tsx` y `panels/cafeteria-panel.tsx` con sus búsquedas
- [ ] 3.5 Crear `panels/bubas-panel.tsx` (**el más grande**): tamaños, sabores, bobas, toppings, la matriz de precios y los 4 pares `editing*`/`*Edit`
- [ ] 3.6 Crear `panels/salsas-panel.tsx` con `salsaForm`, `salsaEdit`, `editingSalsa`
- [ ] 3.7 Reducir `menu-manager.tsx` a `activeTab` + props + render del panel activo; verificar < 150 líneas y `pnpm --filter @bbspos/admin typecheck`
- [ ] 3.8 Confirmar que ningún panel lee el estado de otro (grep de imports cruzados entre `panels/`)
- [ ] 3.9 **Manual:** recorrer las 6 pestañas y ejecutar en cada una alta, edición y baja de su entidad; verificar que guardan en BD
- [ ] 3.10 **Manual (regresión clave):** llenar un formulario a medias, cambiar de pestaña y volver; verificar que el estado se conserva y que ninguna pestaña borra el formulario de otra

## 4. F3 · Estado extraído a hooks

- [ ] 4.1 Separar el cálculo puro de `useQueueClock` en funciones sin React (`delayMinutesOf`, etc.) dejando el `useEffect` de tick como adaptador fino; verificar typecheck
- [ ] 4.2 Instalar Vitest + script `test` en el `package.json` del workspace
- [ ] 4.3 Tests de los helpers de `useQueueClock` (minutos transcurridos, ventana de reserva, formato de hora) con casos de borde (pedido recién creado, reserva fuera de ventana)
- [ ] 4.4 Tests de `presetRange` / `todayStr` / `daysAgoStr` / `monthStartStr` de reportes
- [ ] 4.5 Tests de la matriz de precios y del cálculo de Loyalty si la lógica queda extraída
- [ ] 4.6 Verificar que `pnpm -r test` pasa en verde

## 5. F5 · Guardrails

- [ ] 5.1 Añadir `max-lines: 400` y `max-lines-per-function: 200` como `warn` a `apps/admin/.eslintrc.cjs` y `apps/cajero/.eslintrc.cjs`
- [ ] 5.2 Ejecutar `pnpm -r lint` y confirmar que la lista de warnings es entendible y razonable (no cientos de avisos inesperados) — es la medición del estado real
- [ ] 5.3 Resolver los warnings que quedan o desactivar la regla por línea con comentario explicativo
- [ ] 5.4 Promover ambas reglas a `error`; verificar `pnpm -r lint` verde con la regla activa
- [ ] 5.5 Añadir `max-lines` equivalente a `apps/mesero` y `apps/store` si tienen archivos fuera de rango

## 6. F4 · Piezas POS compartidas (opcional, change propio)

- [ ] 6.1 Evaluar si cajero y mesero pueden consumir `flavor-picker` / `size-selector` de `packages/ui` sin cambiar la UX
- [ ] 6.2 Si sí, migrar primero el mesero (más chico) y luego el cajero
- [ ] 6.3 Si no, documentar el motivo y cerrarlo; **no** forzar la unificación de `pos-terminal.tsx`

## 7. Cierre

- [ ] 7.1 `pnpm -r typecheck`, `pnpm -r lint` y `pnpm -r test` verdes
- [ ] 7.2 Repetir el checklist completo `docs/VERIFICACION-MANUAL-CAJAERO-ADMIN.md` y comparar contra la línea base de 0.2 (sin regresiones nuevas)
- [ ] 7.3 Actualizar `docs/ARQUITECTURA-BBSPOS.md` §7 (deuda técnica): retirar el punto 10 sobre componentes gigantes o reducirlo a lo que quede
