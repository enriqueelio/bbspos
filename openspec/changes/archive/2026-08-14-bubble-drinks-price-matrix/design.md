## Context

El modelo actual usa precios aditivos en céntimos (`Size.price + Flavor.price + BobaType.price`) con 3 tamaños y 4 bobas. El catálogo nuevo exige precio por matriz `(categoría × tamaño × boba)` en bolivianos enteros, 2 tamaños, 2 bobas y toppings opcionales aditivos. Las apps comparten tipos en `packages/types` y datos en `packages/db` (Prisma/SQLite). El estado se ve en `proposal.md` (motivación) y en los deltas de `drink-builder`, `drink-catalog` y `ordering` (comportamiento).

## Goals / Non-Goals

**Goals:**
- Modelo de datos que exprese la matriz de precios y los toppings (obligatorio para registrar transacciones con modificadores).
- Configurador que guíe categoría → sabor → tamaño+boba → toppings con precio en tiempo real en Bs.
- Admin capaz de mantener catálogo, matriz y toppings.
- Pedidos que persistan precio base de matriz + toppings con valores capturados.

**Non-Goals:**
- No se añade multi-moneda ni IVA/impuestos.
- No se toca el flujo de estados de pedido ni la autenticación.
- No se introducen "grupos de modificadores" genéricos tipo POS; basta la estructura fija del documento.

## Decisions

**1. Precios en bolivianos enteros, no en céntimos**
Se guarda `20` para 20 Bs. `formatPrice` de `packages/types` pasa a emitir `"20 Bs"` (antes céntimos como MXN). Justificación: la matriz del negocio se expresa en Bs enteros y evita ambigüedad. Alternativa descartada: mantener céntimos (2000) — innecesario, no hay montos con decimales.

**2. La matriz de precios es una tabla propia (`DrinkPrice`)**
Modelo con `category`, `sizeId`, `bobaTypeId` y `price`, con índice único sobre las tres columnas. Se quita `price` de `Size`, `Flavor` y `BobaType`. Justificación: la matriz es la fuente de verdad del precio y es gestionable por el admin. Alternativa: campos calculados en la aplicación — se descarta porque el admin debe editarla.

**3. Toppings como entidad (`Topping`) con precio aditivo**
`Topping { name, price, available }`. En pedidos se captura `OrderItemTopping { orderItemId, toppingName, unitPrice }` (una fila por topping elegido en cada bebida). Alternativa: columna JSON en `OrderItem` — se descarta por normalización y para que el admin pueda gestionarlos.

**4. El paso de tamaño+boba se presenta como la matriz 2×2**
El paso 3 del configurador muestra la rejilla Grande/Extragrande × Tapioca/Explosivas con el precio de cada celda según la categoría elegida; el cliente elige una celda (selecciona tamaño y boba a la vez). Justificación: coincide con cómo el negocio concibe el precio y reduce errores. Ambos atributos quedan obligatorios (una celda implica ambos).

**5. Las categorías conservan los enum MILK/WATER/SPECIAL**
Se mantienen los valores del enum en BD y solo cambian las etiquetas a "Con leche", "Con agua" y "Especiales". Evita una migración de enum en SQLite. Los sabores de la semilla pasan a la lista exacta del documento.

**5b. Un sabor puede pertenecer a varias categorías**
"Frutilla" aparece en el documento en Con agua y en Con leche. En lugar de duplicar el nombre (único en el modelo), `Flavor` usa una relación muchos-a-muchos con `FlavorCategoryLink { flavorId, category }` (única por par). El configurador filtra por la categoría elegida. Alternativa descartada: renombrar "Frutilla con leche" — alteraba el catálogo del documento.

**6. El ítem de pedido conserva su estructura actual**
`OrderItem` sigue guardando `sizeName`, `flavorName`, `flavorCategory`, `bobaTypeName`, `unitPrice` (ahora precio de matriz) y `quantity`, y se le agrega la relación `toppings`. El total del pedido = Σ (unitPrice + toppings) × quantity. Los precios quedan inmutablemente capturados.

**7. Carrito persistido con almacenamiento nuevo**
`cart-store` cambia su forma (añade toppings y precio base). Se renombra la clave de persistencia de Zustand para descartar carritos antiguos incompatibles.

**8. La semilla regenera el catálogo**
Además de upsert, elimina tamaños, sabores y bobas obsoletos (Chico/Mediano, sabores viejos) para que el catálogo quede exactamente como el documento.

## Tablas SQL resultantes

| Tabla | Columnas | Notas |
| --- | --- | --- |
| `Size` | id, name, oz, available | Grande (16 oz), Extragrande (21 oz); sin precio |
| `Flavor` | id, name, available | categorías vía `FlavorCategoryLink` |
| `FlavorCategoryLink` | id, flavorId, category | única (flavorId, category); un sabor puede tener varias |
| `BobaType` | id, name, kind, available | Tapioca, Explosivas |
| `DrinkPrice` | id, category, sizeId, bobaTypeId, price | única (category, sizeId, bobaTypeId) |
| `Topping` | id, name, price, available | boba extra +4, explosivas extra +5 |
| `Order` | id, status, total, createdAt | |
| `OrderItem` | id, orderId, sizeName, flavorName, flavorCategory, bobaTypeName, unitPrice, quantity | unitPrice = precio de matriz |
| `OrderItemTopping` | id, orderItemId, toppingName, unitPrice | una fila por topping |

## Risks / Trade-offs

- **Columnas `price` eliminadas de catálogo** → la migración es destructiva para precios; se ejecuta sobre datos de desarrollo. Mitigación: la migración + reseed regeneran el catálogo; backup previo si hubiera datos reales.
- **SQLite reescribe tablas al eliminar columnas** → se genera una migración explícita y se verifica con `migrate dev`/`deploy`.
- **Carritos viejos en localStorage incompatibles** → cambio de clave de persistencia; los carritos antiguos se descartan en el cliente.
- **Cambio de formato de moneda afecta a todas las vistas** → `formatPrice` centralizado en `packages/types`; se revisa store y admin al aplicar.

## Migration Plan

1. Editar `schema.prisma` y ejecutar `prisma migrate dev --name bubble-drinks-price-matrix` (genera la migración; reseed manual tras ella).
2. Actualizar `seed.ts` (nuevos tamaños/bobas, lista exacta de sabores, matriz completa, toppings; elimina obsoletos).
3. Actualizar tipos, store, admin y UI; verificar `typecheck`, `lint`, `build`.
4. Smoke test: configurar bebida con toppings, crear pedido y verificar detalle en admin.
5. Rollback: restaurar la migración anterior y la semilla previa (los precios antiguos solo existían en datos de desarrollo).

## Open Questions

- *(ninguna; las decisiones de moneda, reemplazo del modelo y alcance del admin se resolvieron con el usuario antes de crear la propuesta.)*
