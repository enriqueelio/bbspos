# Auditoría UX/UI — App de Cajero (BBSPOS) · v2

**Fecha:** 2026-09-08 · **Ámbito (estado actual del código):**
- `apps/cajero/components/pos/pos-terminal.tsx` — Nueva Venta (ticket + catálogo)
- `apps/cajero/components/queue-view.tsx` — Dashboard (cola y cobro, `ChargeGrid`)
- `apps/cajero/components/split-payment-dialog.tsx` — Pago dividido (Efectivo/QR)
- `apps/cajero/components/pension-payment-dialog.tsx` — Cuenta Pensionado
- `apps/cajero/app/globals.css` — tokens de tema

**Referentes:** Square, Clover, Lightspeed Restaurant, TouchBistro.

---

## 0. Estructura real (aclaración necesaria)

La descripción habla de **3 secciones** (Ticket / central / derecha con categorías
arriba y productos abajo). El código implementa **2 paneles** en `pos-terminal.tsx`:

```
┌──────────────┬────────────────────────────────┐
│ Ticket (34%) │  cabecera: Menú del día +      │
│ pago anclado │  categorías (chips horizontales)│
│ al fondo     ├────────────────────────────────┤
│              │  grilla scrolleable de          │
│              │  productos de la categoría      │
└──────────────┴────────────────────────────────┘
```

- No existe "área central" tipo Clover: **el cobro no vive en el ticket de Nueva
  Venta**, sino en la vista Dashboard (`queue-view.tsx`), donde cada pedido es
  una `Card` con su `ChargeGrid` de botones. Este es el punto más importante
  para la sección 3.
- La corrección es buena (Square/Lightspeed usan ticket + catálogo); se mantiene.

---

## 1. Evaluación de la Estructura Base

### 1.1 Contraste del tema oscuro (estado post-ajustes de la v1)

| Token | Fondo | Ratio | Resultado |
|---|---|---|---|
| `--foreground` blanco (210 40% 98%) | slate-900 | ~15.9:1 | ✅ AAA |
| `--muted-foreground` **74%** (corregido) | slate-900 | ~11:1 | ✅ AAA |
| `--secondary-foreground` blanco | slate-600 | ~7:1 | ✅ AA/AAA |
| Productos idle `text-slate-100` | slate-900/50 | ~13:1 | ✅ AAA |

**Veredicto de contraste:** ya cumplimos WCAG AAA en la base. La fatiga restante
no viene del contraste sino de **redundancia visual** (ver 1.2).

### 1.2 Capitalización: problema heredado que empeoró con la v1

El fix 1 (categorías `uppercase + font-bold`) **aplicó UPPERCASE a TODOS los
chips**, incluidos extras y subcategorías ("+ TAPIOCA", "ESPECIALES", "CON
LECHE"). Ahora hay **todavía más voces tipográficas** en el mismo panel:
- UPPERCASE: cabeceras, EFECTIVO/QR, chips, botones de cantidad, "LIMPIAR".
- `capitalize`: "Enviar y cobrar", "Marcar entregado", "Cuenta Pensionado",
  "Confirmar producto".
- Frases sueltas en minúscula.

En jornadas largas el ojo no encuentra un "ancla" jerárquica. **Recomendación
correcta:** UPPERCASE solo para (a) métodos de pago, (b) total, (c) secciones del
configurador. Todo lo demás en `capitalize`. Es un ajuste de clase, no de
estructura.

---

## 2. Comparativa UX/UI de Clase Mundial

### 2.1 Square & Clover — minimalismo y velocidad de cobro

- **Square** cobra en 2 toques: abrir ticket → botón grande "Cobrar". El total
  **siempre fijo** en esquina inferior derecha. ✅ Nosotros lo replicamos con el
  área de pago anclada al ticket (34%).
- **Clover** separa visualmente *add items* (catálogo) de *tender* (cobro) con
  barras de color. Nosotros mezclamos ambos en el mismo panel azul.
- **Espacio negativo:** el configurador de Bubble Drinks ya fue aireado
  (`mt-2 space-y-3`), pero el ticket sigue apilando ítems con `space-y-2` y el
  `ChargeGrid` usa `grid-cols-2` hasta `lg` — en tablets el EFECTIVO/QR quedan
  **aplastados** (2 columnas) y los otros dos botones caen a la fila de abajo
  con alturas distintas. Square mantendría 4 botones **iguales en una fila**.

### 2.2 Lightspeed & TouchBistro — colores de acento en acciones críticas

| Acción | Estándar (Lightspeed/TouchBistro) | BBSPOS hoy | GAP |
|---|---|---|---|
| **Cobrar efectivo** | Verde dinero sólido | `variant="default"` (azul) = mismo color que QR | 🔴 Sin diferenciación |
| **Cobrar QR/digital** | Azul/outline neutro | `variant="default"` (azul) | 🔴 Idéntico al efectivo |
| **Entregar** | Verde confirmación | `bg-emerald-500` ✅ | 🟢 Correcto |
| **Destructivo** | Rojo permanente | "Limpiar" tinto ✅ (corregido v1) | 🟢 Correcto |
| **Precaución** | Ámbar único | Ámbar Menú del Día + semáforo | 🔴 Ambiguo (heredado) |
| **Cuenta/cliente** | Acento propio | Violeta pensionado ✅ (v1) | 🟢 Correcto |

**Veredicto:** el gap principal es que **EFECTIVO y QR comparten el mismo azul**.
Lightspeed reserva verde a "dinero en caja" y azul a "digital". Hoy un cajero no
puede distinguir el método de un vistazo en la cola.

---

## 3. Interfaz de Pagos Mixtos (Efectivo + QR) — análisis y propuesta

### 3.1 Cómo se despliega hoy (estado real)

1. **En la cola** cada pedido no pagado muestra un `ChargeGrid` con 4 botones:
   `EFECTIVO`, `QR`, `Cuenta Pensionado`, `Reimprimir`.
2. Cada método hace **cobro único** la primera opción: `acceptOrder(id,"EFECTIVO")`
   o `acceptOrder(id,"QR")` registran un solo método.
3. Para mixto existe `SplitPaymentDialog` (numpad "Primer pago" → total se
   calcula → "Segundo pago"), y `acceptOrder` ya acepta `method2` + `amount2`.
4. 🔴 **HALLAZGO CRÍTICO:** al reemplazar el botón "Cobro dividido" por
   "Cuenta Pensionado" (v1, fix 5), el trigger del diálogo quedó **huérfano**:
   `onSplit` sigue conectado (`queue-view.tsx:398,419,441`) y el diálogo sigue
   importado, pero **ningún botón visible lo invoca**. Hoy un cajero **no puede
   cobrar mitad efectivo / mitad QR** en producción.

### 3.2 Deficiencias del diálogo actual (además de estar huérfano)

| Defecto | Detalle |
|---|---|
| **Modal de gran altura** | numpad `h-16` + display `text-4xl` empujan el contenido; en táctil pequeño exige scroll accidental. |
| **Flujo a 2 métodos rígido** | apto solo para "pago 1 + pago 2"; no escala a ≥3 métodos ni a "resto exacto". |
| **Sin quick-fills** | el cajero digita el monto completo; Square/Lightspeed ofrecen "Mitad", "25%", "Exacto/Resto". |
| **Entrada numérica frágil** | `parseInt` con `>= total` bloquea en `total-1`; si el cajero escribe "mitad exacta" con decimal OK, pero un error cambia la distribución sin aviso. |
| **Sin señal de saldo en caja** | QR no indica montos recibidos del cliente durante el proceso mixto. |

### 3.3 Propuesta UI (inspirada en Square "tender" + Lightspeed)

En vez de un modal alto, un **panel inline plegable dentro de la Card del pedido**
(bajo `Total`), que el cajero activa tocando un botón compacto. Escala vertical
cero cuando no se usa:

```
┌─ Pedido #12 ────────────────────────────────┐
│  EFECTIVO   QR   Cuenta    [÷ Dividir]  ⥁   │   ← fila de acciones
├─────────────────────────────────────────────┤
│  ▶ PAGO MIXTO        Total: 120             │   ← panel se despliega
│  ┌ Efectivo (80) ──┐  ┌ QR (40) ────────┐  │
│  │ [¾ Exacto] [½] [¼]│ │  [ Resto ]      │  │   ← quick-fill chips
│  └─────────────────┘  └─────────────────┘  │
│  ┌ 7 8 9 ┐  ┌ 4 5 6 ┐  ┌ 1 2 3 / 0 ⌫ ┐   │   ← numpad compacto h-14
│  └────────┘  └───────┘  └───────────────┘  │
└────────────────────────────────────────────┘
```

Principios de la propuesta:
1. **Trigger siempre visible**: botón `÷` compacto junto a QR (fix inmediato de
   la orfandad). Al abrir, solo el área de montos se expande (cuello de botella
   de altura controlado, numpad `h-14` = −2 de altura por tecla).
2. **Quick-fill chips** en el método primario: `½`, `¼`, `Exacto`, y el secundario
   calcula el *resto* automáticamente (patrón Lightspeed).
3. **Un solo input grande por fila**: el monto que se edita queda resaltado
   (`border-primary ring`), el otro se recalcula en vivo y en `font-mono`.
4. **Convención Square**: mantener el total fijo arriba del panel —
   `Total Bs 120` seguido de las dos líneas de método+monto.
5. **Acento semántico**: Efectivo en verde (dinero), QR en azul outline, y el
   resto del monto en ámbar cuando falta completar.

**Backend ya listo**: `acceptOrder(id, method, method2, amount2)` valida métodos
distintos, montos >0 y < total. Solo falta re-conectar la UI. Reutilizar
`SplitPaymentDialog` mínimo (quick-fills + numpad `h-14`), o embeberlo inline; la
recomendación es **inline** para reducir saltos de contexto.

---

## 4. Entregables

### 4.1 Puntos fuertes actuales

1. Contraste **AAA** en toda la base (mejorado en v1 con `--muted-foreground` 74%).
2. Layout de 2 paneles con total anclado — patrón Square/Lightspeed.
3. Backend de pagos mixtos **ya implementado y validado** (`acceptOrder` con
   `method2`/`amount2`); solo falta el trigger UI.
4. "Limpiar" y "Cuenta Pensionado" con acento semántico correcto (rojo/violeta).
5. Feedback táctil consistente (`active:scale`), semáforo de demora legible.

### 4.2 Deficiencias visuales

1. 🔴 **Pago dividido inaccesible**: `SplitPaymentDialog` orfanizado (sin botón).
2. 🔴 **EFECTIVO y QR son el mismo azul** — sin diferenciación de acento.
3. **Triple voz tipográfica** (UPPERCASE global aplicado por el fix 1 v1, más
   `capitalize` y frases) — no hay ancla jerárquica.
4. **Ámbar ambiguo**: Menú del Día usa el mismo ámbar que el semáforo de demora.
5. **ChargeGrid irregular en tablets**: `grid-cols-2` aplasta EFECTIVO/QR.
6. **Diálogo dividido alto** (numpad `h-16`, display `text-4xl`) → riesgo de
   scroll en táctil.

### 4.3 5 ajustes rápidos de clases Tailwind (hoy)

```tsx
// 1) Re-conectar el pago dividido: botón ghost compacto en el ChargeGrid
//    (queue-view.tsx, junto a Reprint) — restaura la orfandad (sección 3.1)
+ <Button variant="outline" className="h-14 w-full border-slate-600
+    bg-slate-900/60 text-sm font-bold text-slate-200
+    hover:border-slate-400 hover:text-white" disabled={busy} onClick={onSplit}>
+   ÷ Dividir
+ </Button>

// 2) Diferenciar métodos: Efectivo = verde dinero (Square), QR = azul outline.
//    Reemplazar salida de ChargeGrid:
- <Button variant="default" ... >EFECTIVO</Button>   // fila EFECTIVO
+ <Button className="h-14 w-full text-lg font-bold text-white
+    bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400
+    hover:to-emerald-600 shadow-lg shadow-emerald-950/40" ...>EFECTIVO</Button>
- <Button variant="default" ... >QR</Button>          // fila QR
+ <Button className="h-14 w-full text-lg font-bold text-white
+    border border-primary/60 bg-primary/10 hover:bg-primary/20" ...>QR</Button>

// 3) Display de monto del diálogo: mala legibilidad del "Segundo pago".
//    split-payment-dialog.tsx:159 (montos en azul sobre muted)
- <span className="ml-2 text-lg font-bold text-primary">…
+ <span className="ml-2 font-mono text-xl font-black text-white">…

// 4) Compactar numpad y separador para táctil pequeño
//    split-payment-dialog.tsx:116,128,136
- className="grid grid-cols-3 gap-2 mt-4" … h-16     // numpad
+ className="grid grid-cols-3 gap-1.5 mt-3" … h-14
- <div className="flex items-center gap-2 text-base text-white">… "queda X"
+ <div className="flex items-center gap-2 text-sm text-slate-300">…
+   <span className="font-bold text-amber-300"> queda {formatPrice(...)} </span>

// 5) Chips de categoría UPPERCASE → revertir a capitalize para restaurar la voz
//    tipográfica única (undo parcial del fix 1 v1). pos-terminal.tsx:66
- "…text-sm font-bold uppercase tracking-wide…"
+ "…text-sm font-bold capitalize tracking-wide…"
```

### 4.4 Priorización sugerida

| # | Cambio | Esfuerzo | Impacto |
|---|---|---|---|
| 1 | Re-conectar "÷ Dividir" (fix 4.3.1) | 5 min | 🔴 Desbloquea recaudo mixto |
| 2 | Verde Efectivo / azul QR (4.3.2) | 10 min | Semántica de dinero |
| 3 | Restaurar `capitalize` en chips (4.3.5) | 2 min | Ancla tipográfica |
| 4 | Compactar diálogo dividido (4.3.3–4.3.4) | 15 min | Táctil pequeño |
| 5 | Panel inline propuesto (3.3) | 2–3 h | Experiencia Square/Lightspeed |