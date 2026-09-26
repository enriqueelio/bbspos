## Context

El atajo vive entero en un solo hook, `apps/cajero/components/pos/use-pos-keyboard.ts`: un `keydown` en `window` con dependencia `[]` que mapea `1`–`9` al índice de `catalogPanes` y dispara `submit()` con `Enter`. El único punto de uso es `pos-terminal.tsx:846-854`. La parte visible es el `ShortcutBadge` de `pos-category-bar.tsx:93-113`, que pinta el índice en la esquina de cada tarjeta de sección.

Los dos capturadores de teclas que quedan son de otra naturaleza: el `Enter` del campo de nombre (`pos-ticket-panel.tsx:386-395`) es un `onKeyDown` de un input, y los tres `Escape` (`settings-menu.tsx:46-55`, `queue-view.tsx:552-558`, `lunch-stock-badge.tsx:94-109`) solo se registran con el menú o popover abierto. Ninguno hace soltar el mouse. La grilla del arqueo (`cash-close-view.tsx:112-124`) está en spec (`cashier`) y vive en la pestaña de cierre, no en la venta.

`catalogPanes` sobrevive al cambio: lo usa la barra visible (`pos-category-bar.tsx`) y el `PosCartaGrid`, así que solo hay que dejar de pasarle ese prop al hook.

## Goals / Non-Goals

**Goals:**

- Que ninguna tecla global del POS navegue ni cobre.
- Que el número de la tarjeta de almuerzo quede como el único número en su esquina.
- Que el cambio sea borrado, no desactivado: nada de listener muerto ni de flags.

**Non-Goals:**

- No se toca el teclado dentro de inputs ni el `Escape` de los menús. El pedido es quitar lo que obliga a soltar el mouse, no todo lo que se puede tocar con teclado.
- No se rediseña el contador de almuerzo: mismo aspecto, mismo color, mismo comportamiento.
- No se toca el POS del mesero ni la grilla del arqueo.

## Decisions

**1. Borrar el archivo, no vaciarlo.** No queda prop para poner en `false` ni condición que apagar: si alguien lo vuelve a agregar, tiene que volver a escribir la captura global. Alternativa considerada: dejar el hook con un `enabled` que hoy sea `false`. Descartada porque un atajo muerto que sigue compilando es la forma más fácil de que vuelva sin que nadie lo note.

**2. El cobro no se reemplaza por nada.** Queda el botón de cobro del ticket, que ya es la vía real y además valida `formOk` (nombre y tipo de entrega). `Enter` era más permisivo: solo miraba `hasItems && !busy`, así que podía lanzar un cobro que terminaba en error. Perder esa tecla no pierde ninguna capacidad, deja de haber una vía que parece funcionar y no cobra.

**3. Se borra el `ShortcutBadge`, no se reescribe la barra.** El badge era un afordador de un atajo que ya no existe: dejarlo sería mentir sobre la interfaz. Como el contador de almuerzo tenía el mismo redondeo, tipografía y esquina "calcado" del badge, quitarlo elimina la fuente de la confusión sin tocar el contador.

**4. El comentario de `BADGE_BASE` se reescribe, el estilo no.** Decía "calcado del badge de atajos de la barra de categorías (pos-category-bar.tsx)": sin ese componente la referencia queda rota. Se documenta el estilo por lo que es — un contador compacto y legible en la esquina — en vez de dejarlo apuntando a código inexistente.

**5. El atajo no estaba en ninguna spec, así que la delta "MODIFICA" el contador.** El único rastro normativo era la frase "con el mismo lenguaje visual que los números de acceso directo del catálogo" del requirement del contador. Sin badge, esa frase no tiene referente, así que se reemplaza por la garantía que importa: el número de la tarjeta es el único número de esa esquina. El comportamiento nuevo (solo clic, sin `Enter`, sin numeritos) entra como requirement nuevo.

**6. La tarjeta de sección pierde el anillo de foco, y es parte de este cambio.** Con los atajos fuera, elegir sección es un clic, y el clic deja la tarjeta enfocada. Chrome dibuja su `outline` por defecto solo cuando la última interacción fue de teclado (heurística de `:focus-visible`), así que al apretar cualquier tecla el anillo blanco del sistema aparecía sobre el fondo oscuro y se leía como "el borde cambió a blanco". Antes pasaba desapercibido porque la tecla cambiaba de sección y el anillo se iba a otra tarjeta. Se aplica `focus:outline-none`, el mismo tratamiento que ya tienen los campos de texto del POS. Alternativa considerada: un anillo temático con `focus-visible:ring` para no perder la indicación de foco. Descartada porque el POS ya no tiene navegación por teclado que indicar, y porque el usuario reportó justamente que un cambio de color al apretar una tecla se lee como una falla.

## Risks / Trade-offs

- **Alguien que cobraba con `Enter` va a apretar `Enter` y no pasa nada.** Es el riesgo pedido, y es visible (nada cambia) en vez de silencioso (un cobro disparado a destiempo). → Mitigación: el botón de cobro es grande, está siempre a la vista en el centro, y ya valida lo que falte antes de cobrar.
- **Se pierde el salto rápido entre secciones.** Con hasta 16 paneles, cambiar de sección por clic lleva un clic más. → Mitigación: es un clic en un botón grande ya visible, contra el viaje al teclado y la vuelta; el personal ya lo venía haciendo así.
- **Borrar un archivo y 20 líneas es un cambio chico, pero toca una spec canónica.** → `openspec validate --specs` corre después de sincronizar para confirmar que el requirement del contador sigue siendo coherente.
- **El listener se registraba con `[]` y no miraba si había un modal abierto**, así que `1`–`9` cambiaban la categoría por detrás de los diálogos de pago y `Enter` podía cobrar en vez de confirmar. Al borrarlo, ese problema desaparece solo; no hay que corregirlo.
- **Quitar el anillo de foco degrada la navegación por Tab en la barra de secciones.** Como la tarjeta sigue siendo un `<button>`, Tab + Enter la activan igual; lo que se pierde es ver dónde está el foco. Es el mismo criterio con el que el POS ya trata sus campos de texto, y es coherente con una vista de venta que se conduce con el mouse. → Si alguna vez vuelve la navegación por teclado, el anillo vuelve con ella.
