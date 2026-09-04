# Informe de la Base de Datos — bbspos

> Fecha del informe: 2026-09-04
> Base de datos: `packages/db/prisma/dev.db` (SQLite)
> Estado: **Base recién resetada y sembrada** (catálogo + usuarios, sin órdenes)

---

## 1. Resumen ejecutivo

| Aspecto | Estado |
|---|---|
| Motor | SQLite (un solo archivo `dev.db`, ~979 KB) |
| Integridad | `PRAGMA integrity_check = ok` |
| Migraciones aplicadas | 20 (todas al día, schema en sync) |
| Datos en producción | Catálogo completo + 3 usuarios + 0 órdenes |
| Punto de partida | **Limpio** para integrar información nueva (sin histórico) |

El 2026-09-04 se ejecutó un **reset completo** (`prisma migrate reset --force` + seed). Se eliminaron las 512 órdenes demo/precarga y se dejó únicamente el catálogo base y los usuarios del sistema.

- Respaldo de la base anterior: `dev.db.backup-20260904.db` (978 KB).

---

## 2. Estructura y tablas actuales

Modelo de negocio *bubble tea*: no existe una tabla global `productos`; el catálogo se compone de **Sabor × Tamaño × Tipo de boba** con una matriz de precios y toppings.

| Tabla | Registros | Descripción |
|---|--:|---|
| `Size` | 2 | Tamaños de vaso |
| `Flavor` | 18 | Sabores (productos) |
| `FlavorCategoryLink` | 19 | Asociación sabor ↔ categoría |
| `BobaType` | 2 | Tipos de boba |
| `DrinkPrice` | 12 | Matriz de precios |
| `Topping` | 2 | Complementos |
| `User` | 3 | Usuarios del sistema |
| `Order` | 0 | Órdenes |
| `OrderItem` | 0 | Líneas de bebida por orden |
| `OrderItemTopping` | 0 | Toppings por línea de orden |
| `PaymentConfig` | 0 | QR de pago (aún sin configurar) |
| `DailyReportLog` | 0 | Cierres de caja enviados (aún sin uso) |
| `_prisma_migrations` | 20 | Historial de migraciones |

### 2.1 Modelos y enums

- **Catálogo**: `Size`, `Flavor`, `FlavorCategoryLink`, `BobaType`, `DrinkPrice`, `Topping`.
- **Operación**: `Order`, `OrderItem`, `OrderItemTopping`.
- **Configuración**: `PaymentConfig`, `DailyReportLog`.
- **Enums**: `FlavorCategory` (MILK | WATER | SPECIAL), `BobaKind` (TAPIOCA | POPPING), `OrderStatus` (RECIBIDO | ACEPTADO | ENTREGADO | ANULADO), `Role` (ADMIN | CAJERO | MESERO), `Shift` (MANANA | TARDE | SIN_TURNO), `PaymentMethod` (EFECTIVO | QR | TARJETA), `DeliveryType` (MESA | LLEVAR).

---

## 3. Estado del catálogo de productos

Todo el catálogo está **activo** (100 %); no hay productos inactivos.

| Elemento | Total | Activos | Inactivos |
|---|--:|--:|--:|
| Sabores | 18 | 18 | 0 |
| Tamaños | 2 | 2 | 0 |
| Tipos de boba | 2 | 2 | 0 |
| Toppings | 2 | 2 | 0 |
| Precios de matriz | 12 | — | — |

### 3.1 Sabores (18) por categoría

| Categoría | Sabores | Enlaces |
|---|--:|--:|
| SPECIAL (Especiales) | 8 | 8 |
| WATER (Con agua) | 6 | 6 |
| MILK (Con leche) | 5 | 5 |

Sabores sembrados: Capuchino, Oreo, Fruticoco, Matcha, Piña colada, Limonada brasilera, Frutilimon, Taro, Frutilla (agua+leche), Limón, Piña, Manzana, Naranja, Mango, Coco, Vainilla, Chocolate, Mora.

### 3.2 Matriz de precios (Bs, enteros)

| Categoría | Grande Tapioca | Grande Explosivas | Extragrande Tapioca | Extragrande Explosivas |
|---|--:|--:|--:|--:|
| SPECIAL | 20 | 25 | 30 | 35 |
| WATER | 16 | 20 | 25 | 30 |
| MILK | 18 | 22 | 28 | 32 |

### 3.3 Toppings

| Nombre | Precio (Bs) | Activo |
|---|--:|:--:|
| Tapioca extra | 4 | Sí |
| Explosiva extra | 5 | Sí |

---

## 4. Usuarios del sistema

| Username | Nombre | Rol | Activo |
|---|---|---|---|
| `admin` | Administrador | ADMIN | Sí |
| `cajero` | Cajero Principal | CAJERO | Sí |
| `mesero` | Mesero de Turno | MESERO | Sí |

Credenciales de seed: `admin/admin123`, `cajero/cajero123`, `mesero/mesero123`.

---

## 5. Órdenes

- **0 órdenes** (base limpia tras el reset).
- Próximo número de ticket: **#00001** (`MAX(seq)` reiniciado).
- `PaymentConfig` y `DailyReportLog` vacías: aún no se ha configurado el QR de pago ni se han enviado cierres.

---

## 6. Validación inicial

- La base cuenta con los **registros iniciales de catálogo y usuarios** (seed).
- **No** contiene órdenes ni histórico (se limpiaron las 512 órdenes demo).
- Punto de partida ideal para integrar la información posterior sin datos de arrastre.

---

## 7. Nota técnica: migración de schema

Durante el reset, el seed inicial falló porque el schema define la columna `User.shift` y las migraciones existentes no la creaban (la BD anterior se había sincronizado con `db push`). Se agregó la migración:

- `20260904201519_add_user_shift` — añade `shift` (enum `Shift`, default `SIN_TURNO`) a `User`.

Con esto, schema y base quedan sincronizados vía **migraciones** (20 aplicadas) para reconstrucciones futuras (`prisma migrate reset`).

---

## 8. Comandos útiles

```bash
pnpm db:seed        # sembrar catálogo + usuarios (idempotente, upsertea)
pnpm db:migrate     # prisma migrate dev (aplica pendientes)
pnpm db:generate    # regenerar cliente Prisma
```