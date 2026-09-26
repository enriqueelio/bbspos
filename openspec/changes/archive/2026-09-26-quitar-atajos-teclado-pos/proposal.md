## Why

El POS del cajero captura teclas globalmente: `1`–`9` cambian de sección del catálogo y `Enter` cobra. En la práctica el personal no las usa, y en vez de ahorrar tiempo lo gastan: para cambiar de sección o cobrar hay que soltar el mouse, apretar el número y volver al mouse. En una pantalla de 19 pulgadas con la cola, el ticket y el catálogo a la vez, ese viaje es más caro que el clic directo en el botón.

Peor todavía: la numeración de atajos se pintaba como un badge redondo en la esquina superior derecha de cada tarjeta de sección, la misma esquina, con el mismo redondeo y la misma tipografía `font-mono` que el contador de unidades disponibles de cada almuerzo del Menú del Día. El cajero veía dos números iguales en la misma posición sin saber qué significaba cada uno, y el contador de almuerzo —que sí importa— quedaba contaminado por una lectura que no era suya.

No hay ningún dato detrás de la decisión original: el repositorio no tiene telemetría ni contador de uso, y ningún spec de OpenSpec documentó nunca la existencia de los atajos. Fue una decisión de diseño ("flujo rápido tipo Square") sin verificar contra el uso real.

## What Changes

- **Se elimina la captura global de teclas del POS**: se borra `use-pos-keyboard.ts` y su uso en `pos-terminal.tsx`. Las teclas `1`–`9` dejan de cambiar de sección y `Enter` deja de cobrar.
- **Se elimina el badge de atajos** (`ShortcutBadge`) de la barra de secciones del catálogo: cada tarjeta queda solo con su ícono y su nombre.
- **El cobro queda únicamente en el botón del ticket en curso**, que ya valida nombre y tipo de entrega antes de cobrar.
- **La tarjeta de sección no cambia de aspecto al apretar teclas**: se le quita el anillo de foco que dibuja el navegador, que saltaba a la vista en cuanto el cajero apretaba una tecla después de elegir sección y parecía que el borde hubiera cambiado de color.
- **El contador de unidades del almuerzo se independiza de los atajos**: ya no hay un número de atajo al lado con el cual confundirse, así que la spec deja de atarlo al "lenguaje visual de los números de acceso directo del catálogo".
- **No se toca** la escritura en campos de texto (`Enter` en el nombre del cliente), los `Escape` que cierran menús emergentes y el popover del contador, ni la navegación por teclado de la grilla del arqueo de caja: ninguno hace soltar el mouse y todos están atados a un input o a un menú ya abierto.

## Capabilities

### New Capabilities

- Ninguna: no aparece comportamiento nuevo, se quita uno.

### Modified Capabilities

- `pos-terminal`: la barra de secciones SHALL cambiar solo con clic y SHALL NOT mostrar numeritos de atajo ni un anillo de foco de otro color al apretar teclas, el POS SHALL NOT capturar teclas globales para navegar ni para cobrar, y el cobro SHALL quedar solo en el botón del ticket. Además se despega la cláusula del contador que lo ataba al lenguaje visual de los números de acceso directo del catálogo.

## Impact

- `apps/cajero/components/pos/use-pos-keyboard.ts`: se borra el archivo completo.
- `apps/cajero/components/pos/pos-terminal.tsx`: se quitan el `import` (línea 47) y la llamada al hook (líneas 846-854). `catalogPanes` sigue alimentando la barra visible, así que se conserva.
- `apps/cajero/components/pos/pos-category-bar.tsx`: se borra el componente `ShortcutBadge` (líneas 93-113), su render (línea 150), el `relative` que solo lo sostenía, y se agrega `focus:outline-none` a la tarjeta de sección.
- `apps/cajero/components/pos/lunch-stock-badge.tsx`: solo el comentario de `BADGE_BASE`, que decía "calcado del badge de atajos", queda sin referente. Se actualiza el comentario; el estilo del número **no** cambia.
- Sin migraciones, sin cambios de API ni de base de datos, y sin efecto en el POS del mesero (no captura ninguna tecla).
- Riesgo asumido: `Enter` deja de cobrar, así que quien esté acostumbrado a cobrar con teclado tiene que pasar al botón. Es justo lo que pide este cambio.
