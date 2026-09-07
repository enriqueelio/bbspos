# Especificación del monitor del módulo de cajero

Referencia de medidas para el trabajo futuro sobre la UI del módulo de cajero.

## Hardware objetivo

| Medida | Valor |
|---|---|
| Diagonal | 19" (48.3 cm) |
| Relación de aspecto | **16:10** (1.6:1) |
| Resolución nativa | **1440 × 900 px** |
| Densidad | ≈ 89 PPI (ligeramente menor que el estándar web de 96 px/pulgada) |
| Ancho útil de pantalla | ≈ 409 mm (16.1") |
| Alto útil de pantalla | ≈ 256 mm (10.1") |

## Medidas de diseño (CSS)

- **Ancho total disponible**: 1440 px (layout fluido; nunca forzar contendido mayor a 1440 px).
- A 89 PPI una UI diseñada a 96 CSS px por pulgada se ve ~8 % más grande físicamente; evitar anchos fijos al límite.
- **Alto útil de trabajo**: 900 px totales; restando header/nav (~56 px) quedan ≈ 840 px de área vertical.

## Layout de dos columnas

- **Izquierda — ticket/cobro (fijo)**: ~30–35 % → ≈ 430–505 px
- **Derecha — cola de pedidos y gestión**: ~65–70 % → ≈ 935–1005 px
- Distribución en `%`/`fr` (fluido), nunca en anchos fijos rígidos.
- Densidad compacta (text-sm / text-base), mouse + teclado; sin elementos táctiles de tablet.

## Compatibilidad mínima

- La interfaz debe redimensionarse fluidamente y mantenerse usable como mínimo en **1280×1024** (5:4) sin scroll horizontal ni desbordes.

> Fuente: medidas proporcionadas por el operador del local (monitor real 1440×900). Consideraciones de diseño originales en `indicaciones/cajeros.txt`.