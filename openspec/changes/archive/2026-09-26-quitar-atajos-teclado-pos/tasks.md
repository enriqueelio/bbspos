## 1. Sacar la captura de teclas

- [x] 1.1 Borrar `apps/cajero/components/pos/use-pos-keyboard.ts`
- [x] 1.2 Quitar el `import` de `usePosKeyboard` y la llamada con su comentario en `pos-terminal.tsx`
- [x] 1.3 Confirmar que `catalogPanes` sigue usándose (barra visible y grilla) y que no queda código muerto por el hook

## 2. Sacar el afordador visible

- [x] 2.1 Borrar el componente `ShortcutBadge` de `pos-category-bar.tsx`
- [x] 2.2 Borrar su render y revisar que `selected` siga usándose en la tarjeta; el `relative` de `CATEGORY_CARD.base` también se fue, porque solo lo sostenía
- [x] 2.3 Reescribir el comentario de `BADGE_BASE` en `lunch-stock-badge.tsx` para que no apunte al badge de atajos, sin cambiar el estilo del número
- [x] 2.4 Quitar el anillo de foco del navegador en la tarjeta de sección (`focus:outline-none`): al elegir con el clic la tarjeta queda enfocada y, al apretar cualquier tecla, Chrome dibujaba su outline blanco y parecía que el borde había cambiado de color

## 3. Verificación

- [x] 3.1 `pnpm -r typecheck` y `pnpm -r lint` sin errores; la ruta de venta compila en el dev server (2019 módulos, sin errores)
- [x] 3.2 En el POS: apretar `1`–`9` y ver que la sección no cambia; apretar `Enter` con productos en el ticket y ver que no cobra
- [x] 3.3 En el POS: cambiar de sección con clic y cobrar con el botón del ticket, y confirmar que el flujo sigue igual
- [x] 3.4 En el POS: elegir una sección con el clic y apretar cualquier tecla, y ver que el borde verde no cambia ni aparece un anillo blanco
- [x] 3.5 En el POS: mirar las tarjetas de sección (sin numeritos) y las de almuerzo (número de unidades solo) para confirmar que la confusión desapareció
- [x] 3.6 En el POS: escribir el nombre del cliente y presionar `Enter` en ese campo, y cerrar con `Escape` un menú emergente, para confirmar que eso sigue igual
