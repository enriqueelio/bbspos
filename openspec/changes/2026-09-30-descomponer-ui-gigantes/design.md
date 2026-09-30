# Design: descomponer-ui-gigantes

## Context

El diagnóstico sale de medir los archivos, no de estimarlos:

- `MenuManager` (`menu-manager.tsx:685-2226`) = 1541 líneas, **29 `useState`**, 0 `useMemo`, 0 `useCallback`. Los 29 estados se reparten en 8 dominios CRUD que no se hablan entre sí: `sizeForm/editingSize/sizeEdit`, `flavorForm/editingFlavor/flavorEdit`, `bobaForm/editingBoba/bobaEdit`, `toppingForm/editingTopping/toppingEdit`, `cartaModal/cartaDraft/cartaQuery`, `bebidasQuery`, `cafeteriaQuery`, `almuerzoModal/almuerzoDraft/almuerzosQuery`, `salsaForm/salsaEdit/editingSalsa`, más `activeTab`. La UI ya los presenta separados (`MENU_TABS`, línea 207): solo el estado no respeta la frontera.
- `queue-view.tsx` = 1665 líneas con **22 declaraciones de primer nivel** (`useQueueClock` 98 líneas, `ChargeButton` 153, `OrderCard` 522, `QueueView` 313). Las costuras ya están hechas; solo falta el directorio.
- `reports-client.tsx` = 1415 líneas con 11 vistas + `DataTable` + `KpiCard` + config (`REPORT_GROUPS`, `RANGE_PRESETS`, helpers de fecha, líneas 58-180) + el shell `ReportsClient` de 477 líneas con el fetching.
- `pos-terminal.tsx` de cajero (1024) y mesero (957) son **~50% divergentes** tras normalizar el nombre de app: cajero tiene carrito, checkout y `#prices`; mesero solo registra mesa y cantidad de salsas. No son un duplicado, son dos pantallas que comparten el *builder*.

Estado del tooling que hace posible esto:

- ESLint: 8 `.eslintrc.cjs` sueltos, todos idénticos en lo relevante (`next/core-web-vitals` + `next/typescript`). Sin `max-lines`.
- Tests: **cero**. No hay runner ni archivos `*.test.*` / `*.spec.*` en `apps` ni `packages`.
- `packages/ui` existe con `components/builder/{boba-picker,flavor-picker,size-selector,step-indicator}.tsx` y `components/cart/{cart-item,cart-summary,quantity-control}.tsx`, pero los terminales de cajero y mesero **no lo importan**: construyen su propio selector.

## Goals / Non-Goals

**Goals**

- Bajar todo archivo cliente por debajo de 400 líneas y toda función por debajo de 200, sin cambiar comportamiento.
- Que cada dominio de `MenuManager` tenga su estado en su propio módulo, alineado con la pestaña que lo muestra.
- Dejar la lógica de tiempo/fechas del cajero (`useQueueClock`) y la de relatórios como funciones puras verificables.
- Impedir el re-crecimiento con guardrails automáticos y una red de seguridad mínima.

**Non-Goals**

- No unificar `pos-terminal.tsx` de cajero y mesero. Divergen ~50% y fusionarlas es un cambio de producto, no de estructura.
- No introducir state manager (Zustand/Redux), ni atomic-design, ni librería de componentes nueva. El catálogo de `packages/ui` es suficiente.
- No optimizar renders con `useMemo`/`useCallback` manuales antes de partir. Memoizar un monolito esconde el costo en vez de eliminarlo; partir ya reduce los renders por diseño (F2).
- No reescribir lógica de negocio "de paso". Cualquier corrección funcional que aparezca durante el refactor se anota y se hace en su propio change.
- No introducir tests end-to-end de navegador. Playwright es una inversión grande para este repo; el objetivo son tests unitarios de la lógica extraída.

## Decisions

### D1. Partir antes de optimizar

Orden: F1 (costuras) → F2 (monolito) → F3 (hooks) → F4 (compartido) → F5 (guardrails), con la excepción de que F3 se ejecuta junto a F1/F2 donde nazca el código. Razón: cada fase reduce el archivo sobre el que trabaja la siguiente, y el diff de F1 es mecánicamente revisable (leer imports). Si se empieza por memoizar un componente de 1541 líneas, se optimiza trabajo que la fase siguiente va a tirar.

### D2. F1 es movimiento puro, verificable por lectura

En `queue-view.tsx` y `reports-client.tsx` no se toca una línea de lógica. Solo `git mv` + añadir/quitar imports. Beneficio operativo: el diff de esa fase **es** la revisión. Si algo se rompe, está en el diff y no puede estar oculto en una reescritura.

Destino, respetando los límites que ya existen en el código:

- `apps/cajero/components/queue/` → `use-queue-clock.ts` (`useQueueClock` + `horaCreacion`, `isReservation`, `horaReserva`, `minsToScheduled`, `inReservationWindow`), `order-card.tsx` (`OrderCard`, `OrderCardItem`, `PaperBag`), `charge-button.tsx`, `items-list.tsx`, `age-badge.tsx`, `queue-group-accordion.tsx`, `delivery-type-menu.tsx` (`DELIVERY_ICONS`, `DeliveryTypeMenu`, `DeliveryTypeIcon`), `payment-method-icon.tsx`, `empty-queue.tsx`, `confirm-dialog.tsx`, `queue-view.tsx` (orquestador).
- `apps/admin/app/(dashboard)/reports/` → `views/` (11 vistas, una por archivo), `components/` (`DataTable`, `KpiCard`, `EmptyState`), `lib/report-config.ts` (config y helpers), `hooks/use-reports-data.ts` (fetching), `reports-client.tsx` (shell).

`OrderCard` queda en ~522 líneas: sigue por encima del objetivo, así que se subdivide en un segundo paso dentro de la misma fase (cabecera/acciones/cuerpo) o se acepta temporalmente documentado.

### D3. F2: un panel por pestaña, con el estado dentro

Cada pestaña de `MENU_TABS` se convierte en un módulo en `apps/admin/app/(dashboard)/menu/panels/`, y **cada panel declara su propio estado**. `menu-manager.tsx` conserva solo `activeTab`, los datos recibidos por props y el render del panel activo.

Regla dura: un panel **no** lee ni escribe el estado de otro. Si dos paneles necesitan el mismo dato, se sube a props (los datos ya llegan como props desde la server action), no se comparte estado.

Se extraen además los piezas ya delineated al módulo `menu/components/`: `CollapsibleCard`, `SubSection`, `CategoryToggles`, `PriceMatrixEditor`, `MenuItemOptionsEditor`, `ProductImageField`, `MenuSection`.

Por qué aquí y no un `useReducer`: con 8 dominios independientes, separar por dominio ya elimina el acoplamiento. Un reducer único reintroduce un objeto gigante de estado, solo que con menos ruido sintáctico.

### D4. F3: los hooks se extraen porque son testeables, no porque sean largos

`useQueueClock` mezcla cálculo (minutos de espera, ventana de reserva) y temporizadores (`useEffect` de tick). Separado, el cálculo es una función pura `delayMinutesOf(order, nowMs)` testeable sin React. Lo mismo con `presetRange` y `todayStr`/`daysAgoStr`/`monthStartStr` de reportes: son el primer material testeable del repositorio y por eso el refactor se justifica en parte por esto.

### D5. Guardrails en dos tiempos, y qué no usar

`max-lines: 400` y `max-lines-per-function: 200` en los `.eslintrc.cjs` de `admin` y `cajero`, primero como `warn` (para que el lint siga verde y se vea el terreno) y promovidas a `error` al cerrar F2. Se desactivan por línea en los puntos donde la propia descomposición sea la excepción consciente, siempre con comentario.

Descartado: `sonarjs`, `eslint-plugin-complexity` y depender del review humano. Motivo: dependencias nuevas para una regla que `max-lines` ya cubre, y el objetivo es que la restricción sea automática y barata.

### D6. La red de seguridad es un runner, no una suite

Vitest (compatible con el stack Vite/Next ya presente) + tests sobre lo extraído en D4. No se aspiran a cubrir componentes: el criterio es que la lógica de negocio de la UI quede extraída y testeada. Un repo sin tests donde el primer cambio grande es un refactor necesita antes red que cobertura.

### D7. F4 se deja para el final, y es el único opcional

`packages/ui` ya tiene `flavor-picker`, `size-selector`, `boba-picker`, `cart-item`, `cart-summary`, `quantity-control`. Que cajero y mesero construyan los suyos es duplicación real, pero **no bloquea** el problema reportado (tamaño/mantenibilidad) y su radio de alcance es amplio: tocar dos POS a la vez sin una línea de tiempo clara. Se ejecuta solo después de que F1-F3 estén verdes, y en change propio si se decide.

## Risks / Trade-offs

- **Regresión visual no detectable por tooling.** `typecheck` y `lint` pasan aunque un componente deje de renderizar. Mitigación: verificación manual en pantalla por fase, con el checklist de `docs/VERIFICACION-MANUAL-CAJAERO-ADMIN.md` como línea base. Es la razón principal para no comprimir F1-F2 en una sola entrega.
- **Regresión de render difícil de detectar.** Un `useState` mal movido de panel puede producir un formulario que "funciona" pero pierde el valor al cambiar de pestaña. Mitigación: D3 exige que el estado viaje con el panel, y el checklist incluye ir y volver entre pestañas con un formulario a medio llenar.
- **Diff grande y ruidoso.** F1 mueve ~1500 líneas; el review por lectura es válido pero lento. Mitigación: un commit por sub-pieza, nunca un commit único de la fase completa.
- **Tensión con la observación de `useMemo: 0`.** Con los componentes partidos, `menu-manager.tsx` y `queue-view.tsx` quedan con menos estado y menos re-renders sin memoización. Si tras F2 persisten re-renders costosos, se mide antes de memoizar (D1).
- **Presupuesto de tiempo.** Es el change más largo del backlog. Justificado: es la deuda que impide que cualquier otro cambio en Admin sea seguro, y sin F5 se repite.
