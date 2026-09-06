# Informe de diagnóstico — Base de datos actual de bbspos

Reporte generado el 2026-09-05 desde `packages/db/prisma/dev.db`.

- Motor: **SQLite** vía Prisma (`provider = "sqlite"`)
- Archivo: `packages/db/prisma/dev.db`

## 1. Estructura y tablas actuales

Se encontraron **13 tablas** (12 modelos del esquema + tabla interna de migraciones `_prisma_migrations`).

| Tabla | Modelo / Uso |
|---|---|
| `BobaType` | Tipos de boba (TAPIOCA, POPPING) |
| `DailyReportLog` | Registro de cierres de caja diarios enviados a Telegram |
| `DrinkPrice` | Matriz de precios (categoría × tamaño × tipo de boba) |
| `Flavor` | Sabores del catálogo |
| `FlavorCategoryLink` | Vincula sabores a categorías (MILK, WATER, SPECIAL) |
| `Order` | Órdenes |
| `OrderItem` | Ítems de cada orden |
| `OrderItemTopping` | Toppings por ítem |
| `PaymentConfig` | Configuración de pagos (QR) |
| `Size` | Tamaños de bebida (mL/oz) |
| `Topping` | Extras / toppings (nombre y precio) |
| `User` | Usuarios y roles (ADMIN, CAJERO, MESERO) |
| `_prisma_migrations` | Control de migraciones aplicadas por Prisma |

## 2. Estado del catálogo actual

### Recuento de registros por tabla

| Tabla | Registros |
|---|---|
| `BobaType` | 2 |
| `DailyReportLog` | 0 |
| `DrinkPrice` | 12 |
| `Flavor` | 18 |
| `FlavorCategoryLink` | 19 |
| `Order` | 0 |
| `OrderItem` | 0 |
| `OrderItemTopping` | 0 |
| `PaymentConfig` | 0 |
| `Size` | 2 |
| `Topping` | 2 |
| `User` | 3 |
| `_prisma_migrations` | 20 |

### Tamaños (`Size`)

Total: **2** | Activos (available=1): **2** | Inactivos: **0**

| Tamaño | oz | Activo | Creado |
|---|---|---|---|
| Grande | 16 | Sí | 2026-09-05T22:26:11.948Z |
| Extragrande | 21 | Sí | 2026-09-05T22:26:11.957Z |

### Sabores (`Flavor`) y categorías

Total: **18** | Activos: **18** | Inactivos: **0**

Vinculaciones sabor→categoría: **19**

**MILK** (5): Chocolate, Coco, Frutilla, Mora, Vainilla

**WATER** (6): Frutilla, Limón, Mango, Manzana, Naranja, Piña

**SPECIAL** (8): Capuchino, Fruticoco, Frutilimon, Limonada brasilera, Matcha, Oreo, Piña colada, Taro

### Tipos de boba (`BobaType`)

Total: **2**

| Tipo | Kind | Activo |
|---|---|---|
| Explosivas | POPPING | Sí |
| Tapioca | TAPIOCA | Sí |

### Matriz de precios (`DrinkPrice`)

Combinaciones configuradas: **12**

| Categoría | Precios configurados |
|---|---|
| MILK | 4 |
| WATER | 4 |
| SPECIAL | 4 |

| Categoría | Tamaño | Boba | Precio (Bs) |
|---|---|---|---|
| MILK | Grande | Explosivas | 22 |
| MILK | Grande | Tapioca | 18 |
| MILK | Extragrande | Explosivas | 32 |
| MILK | Extragrande | Tapioca | 28 |
| SPECIAL | Grande | Explosivas | 25 |
| SPECIAL | Grande | Tapioca | 20 |
| SPECIAL | Extragrande | Explosivas | 35 |
| SPECIAL | Extragrande | Tapioca | 30 |
| WATER | Grande | Explosivas | 20 |
| WATER | Grande | Tapioca | 16 |
| WATER | Extragrande | Explosivas | 30 |
| WATER | Extragrande | Tapioca | 25 |

### Toppings (extras)

Total: **2** | Activos: **2**

| Topping | Precio (Bs) | Activo | Creado |
|---|---|---|---|
| Explosiva extra | 5 | Sí | 2026-09-05T22:26:12.172Z |
| Tapioca extra | 4 | Sí | 2026-09-05T22:26:12.168Z |

### Válidos vs. posible data de prueba inicial

- Cualquier registro con nombres tipo `test`/`prueba`/`demo`: **ninguno**
- Rango de fechas de creación del catálogo: 2026-09-05T22:26:11.948Z → 2026-09-05T22:26:12.172Z
- Registros de catálogo marcados como **inactivos** (available=0): **0**

## 3. Validación de órdenes y usuarios

### Órdenes

- `Order`: **0** registros
- `OrderItem`: **0**
- `OrderItemTopping`: **0**
- Estado esperado (punto de partida): **0 órdenes** → ✔ CUMPLE

### Usuarios

Total de usuarios: **3**

| Usuario | Nombre | Rol | Turno | Activo | Creado |
|---|---|---|---|---|---|
| `admin` | Administrador | ADMIN | SIN_TURNO | Sí | 2026-09-05T22:26:12.247Z |
| `cajero` | Cajero Principal | CAJERO | SIN_TURNO | Sí | 2026-09-05T22:26:12.324Z |
| `mesero` | Mesero de Turno | MESERO | SIN_TURNO | Sí | 2026-09-05T22:26:12.394Z |

Por rol: ADMIN=1, CAJERO=1, MESERO=1.

### Configuración y cierres

- `PaymentConfig`: **0** registro(s)
- `DailyReportLog` (cierres enviados): **0**

## 4. Resumen de integridad y estado

### PRAGMA integrity_check

- Resultado: `ok` → ✔ integridad correcta

### PRAGMA foreign_key_check

- Violaciones de claves foráneas: **0** → ✔ OK

### Estado general de SQLite

- sqlite version: **3.53.3**
- user_version: **0** (Prisma controla el estado en `_prisma_migrations`, no lo usa)
- journal_mode: **delete**
- page_count: 47 | page_size: 4096 | freelist: 2
- Tamaño del archivo en disco: **188.0 KB**

### Estado de las migraciones

- Migraciones registradas en la BD: **20**
- Aplicadas sin rollback: **20**
- Carpetas de migración en disco: **20**
- Sincronizado (aplicadas == carpetas): **SÍ**

| Migración | Finalizó |
|---|---|
| `20260814161439_init` | 2026-09-05T22:26:09.052Z |
| `20260814180000_bubble_drinks_price_matrix` | 2026-09-05T22:26:09.105Z |
| `20260814180100_flavor_categories` | 2026-09-05T22:26:09.133Z |
| `20260814180200_size_ounces` | 2026-09-05T22:26:09.148Z |
| `20260814190000_payment_config` | 2026-09-05T22:26:09.162Z |
| `20260821173035_order_customer_name` | 2026-09-05T22:26:09.197Z |
| `20260821181500_order_seq` | 2026-09-05T22:26:09.210Z |
| `20260824155140_reports_audit_fields` | 2026-09-05T22:26:09.232Z |
| `20260824173117_cashier_two_states` | 2026-09-05T22:26:09.265Z |
| `20260824192133_add_user_active` | 2026-09-05T22:26:09.284Z |
| `20260824201706_aceptado_three_states` | 2026-09-05T22:26:09.304Z |
| `20260826122907_add_order_indexes` | 2026-09-05T22:26:09.322Z |
| `20260826124904_add_split_payment` | 2026-09-05T22:26:09.335Z |
| `20260826191057_add_delivery_type` | 2026-09-05T22:26:09.345Z |
| `20260827223134_add_order_delay_notified` | 2026-09-05T22:26:09.370Z |
| `20260827224856_add_daily_report_log` | 2026-09-05T22:26:09.381Z |
| `20260828192649_add_username` | 2026-09-05T22:26:09.399Z |
| `20260831203000_add_order_canceled_by` | 2026-09-05T22:26:09.421Z |
| `20260831205000_add_order_discounted_by` | 2026-09-05T22:26:09.438Z |
| `20260904201519_add_user_shift` | 2026-09-05T22:26:09.486Z |

### Conclusión

| Verificación | Estado |
|---|---|
| Órdenes en 0 (punto de partida) | ✔ OK |
| Integridad (integrity_check + foreign_key_check) | ✔ OK |
| Migraciones aplicadas y sincronizadas | ✔ OK |

**Resultado general:** la base de datos de bbspos está limpia, íntegra y lista para operar como punto de partida.
