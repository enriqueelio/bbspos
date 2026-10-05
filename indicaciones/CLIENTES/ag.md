# Directiva de Reestructuración — Módulo Clientes, Pensionados y Lealtad

**Fecha:** 2026-10-05  
**Destinatario:** OpenCode / Agentes de Desarrollo y Mantenimiento  
**Objetivo:** Corregir los problemas de arquitectura de información y UX identificados en `REPORTE-ESTADO-CLIENTES.md`, unificando el directorio de clientes y separando datos operativos de reportes analíticos.

---

## 1. Diagnóstico del Problema (Por qué cambiar el diseño actual)

1. **Fragmentación Artificial de Clientes (Anti-patrón de silos):**
   - Actualmente `/customers/page.tsx` aplica un filtro excluyente (`where: { account: null }`).
   - Cuando un cliente se convierte en pensionado, **desaparece de la lista principal de clientes**.
   - **Regla:** Un pensionado **sigue siendo un cliente**. Todos los clientes deben convivir en un único padrón centralizado.

2. **Contaminación de Datos Maestros con Métricas de Reporte:**
   - La tabla de clientes actual mezcla datos de contacto (Nombre, CI, Teléfono) con métricas analíticas de consumo (Visitas, Gasto total, Puntos, Última visita).
   - Esto satura la pantalla operativa. Las métricas de consumo pertenecen a la **Ficha individual del cliente** y al módulo de **Reportes / Lealtad**, no a la tabla maestra.

---

## 2. Nueva Arquitectura en 3 Módulos Claros

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. /customers (Directorio Único de Clientes)                            │
│    - Padrón central de TODOS los clientes (Normales + Pensionados)     │
│    - Datos de contacto + Badge de condición + Saldo si aplica          │
│    - Acción: "Hacer Pensionado" (sin sacarlo de la lista)              │
│    - Ficha de Cliente: Modal con puntos, visitas e historial           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
       ┌────────────────────────────┴───────────────────────────┐
       ▼                                                        ▼
┌──────────────────────────────────────┐ ┌──────────────────────────────────────┐
│ 2. /pensionados (Cuentas Corrientes) │ │ 3. /customers-ranking (Lealtad)      │
│    - Enfoque 100% contable/financiero│ │    - Enfoque 100% analítico/reporte  │
│    - Saldos, recargas, deudas, ledger│ │    - Ranking por mes, top gasto,     │
│    - Control de límites de crédito   │ │      frecuencia y reglas de premios  │
└──────────────────────────────────────┘ └──────────────────────────────────────┘
```

---

## 3. Especificación Detallada de Pantallas

### A. Pantalla `/customers` (Directorio Único de Clientes)

#### 1. Consulta a Base de Datos (`apps/admin/app/(dashboard)/customers/page.tsx`)
- **Eliminar** la restricción `where: { account: null }`.
- Consultar **todos** los clientes ordenados por nombre:
  ```ts
  const customers = await prisma.customer.findMany({
    orderBy: [{ name: "asc" }],
    include: {
      account: {
        select: { id: true, pensionType: true, balance: true, creditLimit: true }
      }
    }
  });
  ```

#### 2. Filtros Rápidos Superiores (Tabs / Segmented Control)
Permitir segmentar visualmente sin recargar la página:
- `[ Todos (Total) ]`
- `[ Normales (N) ]` (aquellos con `account == null`)
- `[ Pensionados (N) ]` (aquellos con `account != null`)
- Buscador reactivo por texto (filtra por `name`, `ci` o `phone`).

#### 3. Columnas de la Tabla Principal
La tabla debe ser limpia, legible y enfocada en operación:
1. **Cliente:** Nombre completo.
2. **Documento (CI):** CI o `—`.
3. **Teléfono:** Teléfono formateado o `—`.
4. **Condición / Tipo (Badge):**
   - ⚪ `Normal` (para clientes sin cuenta corriente).
   - 🟢 `Pensionado Prepago` (cuenta prepago activa).
   - 🔵 `Pensionado Postpago` (cuenta postpago con crédito).
5. **Cuenta / Saldo:**
   - Para Normal: `—`
   - Para Prepago: `Bs XX.XX (a favor)` en color verde.
   - Para Postpago: `-Bs XX.XX (deuda)` en color rojo si debe, o `Bs 0.00` con límite indicado.
6. **Acciones:**
   - **`Editar`**: Modal para modificar Nombre, CI, Teléfono.
   - **`Ver Ficha`**: Abre modal con la información completa e historial de lealtad.
   - **Acción dinámica de cuenta:**
     - Si es **Normal**: Botón `[Hacer Pensionado]` (abre diálogo para definir modalidad y límite). Al confirmar, el cliente **permanece en la lista** y su badge cambia de inmediato.
     - Si ya es **Pensionado**: Botón `[Gestionar Cuenta]` (atajo para abonar saldo o ver movimientos).

#### 4. Modal / Drawer "Ficha de Cliente" (`CustomerDetailModal`)
Al hacer clic en "Ver Ficha" o en la fila del cliente, se muestra:
- **Datos de Identificación:** Nombre, CI, Teléfono, Fecha de alta.
- **Estado de Cuenta:** Tipo de cliente, Saldo actual, Límite de crédito asignado.
- **Métricas de Lealtad (Caché):**
  - Nivel alcanzado (Bronce / Plata / Oro).
  - Puntos acumulados disponibles.
  - Total visitas registradas.
  - Gasto total acumulado histórico.
  - Fecha de última visita.

---

### B. Pantalla `/pensionados` (Gestión Financiera de Cuentas)

Esta pantalla deja de ser un listado redundante de personas y se convierte en el **panel contable de cuentas corrientes**:
- **Tarjetas KPI Superiores:**
  - `Saldo Total a Favor (Prepago)`: Suma de saldos positivos listos para consumo.
  - `Deuda Total por Cobrar (Postpago)`: Suma de deudas pendientes.
- **Tabla Financiera:**
  - Cliente titular.
  - Modalidad (`PREPAGO` / `POSTPAGO`).
  - Saldo actual con semáforo visual (rojo si hay deuda, verde si hay saldo disponible).
  - Límite de crédito configurado.
  - Acciones financieras directas:
    - `[Recargar / Pagar Deuda]` (agrega fondos con Efectivo o QR).
    - `[Ver Movimientos]` (inspecciona el libro mayor `CustomerLedger`).
    - `[Configurar Cuenta]` (ajustar límite o revertir a normal si balance = 0).
- **Botón "Nueva Cuenta":**
  - Selector/autocompletado que permite elegir **cualquier cliente del padrón** que aún sea normal y abrirle su cuenta en un paso.

---

### C. Pantalla `/customers-ranking` (Lealtad, Frecuencia y Analítica)

Se reserva exclusivamente para reportes de marketing y fidelización:
- Ranking por período: Este mes, Últimos 30 días, Histórico.
- Top clientes por facturación (Bs).
- Top clientes por recurrencia de visitas.
- Reglas de beneficios activas y canjes registrados en `CustomerReward`.

---

## 4. Invariantes Técnicas que NO Deben Romperse

1. **Integridad del Modelo de Datos:**
   - `CustomerAccount` se mantiene como la única fuente de verdad contable (`balance = Σ recargas/pagos - Σ consumos`).
   - `Customer.accountId` nullable vincula la identidad con la cuenta.
2. **Operaciones del Terminal de Ventas (Cajero):**
   - El cobro a cuenta en el cajero (`acceptPensionOrder`) sigue listando solo a clientes con cuenta (`account: { isNot: null }`).
   - El autocompletado general del cajero sigue buscando en todos los clientes (`Customer`) para asociar tickets y acumular lealtad a clientes mostrador.
3. **Cierre de Caja Contable:**
   - Los consumos a cuenta (`CONSUMO`) **no** suman efectivo al arqueo del día.
   - Las recargas y pagos de deuda (`RECARGA` / `PAGO_DEUDA`) **sí** ingresan como dinero real en caja.

---

## 5. Plan de Ejecución para OpenCode

1. **Actualizar `/customers/page.tsx`**: Cambiar la consulta Prisma para incluir a todos los clientes junto con su relación `account`.
2. **Refactorizar `/customers/customers-client.tsx`**:
   - Retirar las columnas de *Visitas, Gasto total, Puntos, Última visita*.
   - Agregar columna de *Tipo/Condición* (Badge) y *Saldo*.
   - Agregar tabs de filtro: `Todos`, `Normales`, `Pensionados`.
   - Crear el componente `CustomerDetailModal` para ver la ficha completa e historial.
   - Asegurar que la acción `convertToPensionado` actualice el estado localmente o mediante `revalidatePath`.
3. **Validación:**
   - Ejecutar `corepack pnpm -r typecheck` y asegurar 0 errores.
   - Probar que un cliente normal pueda convertirse a pensionado y se mantenga visible en `/customers` con su nuevo badge.
