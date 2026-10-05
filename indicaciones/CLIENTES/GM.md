# REFACTORIZACIÓN DEL MÓDULO DE CLIENTES (VISIÓN CRM)

## 1. El Diagnóstico (Lo que está mal hoy)
* **Falsa separación de entidades (UI):** Actualmente, el sistema divide artificialmente a las personas en dos pantallas excluyentes: `/customers` (solo clientes de mostrador) y `/pensionados` (solo cuentas corrientes)[cite: 10]. Esto significa que cuando un cliente normal se convierte en pensionado, "desaparece" de la lista principal de clientes, lo cual es un error grave de experiencia de usuario (UX). Un pensionado sigue siendo un cliente.
* **Saturación visual (DB y UI):** La tabla `Customer` en la base de datos aún almacena directamente los campos de lealtad (`totalVisits`, `totalSpent`, `points`, `lastVisitAt`)[cite: 10]. Como consecuencia, la ruta `/customers` imprime toda esta información de reportes (visitas, puntos, nivel, gasto) directamente al lado del nombre y teléfono[cite: 10], ensuciando visualmente el directorio.
* **La base financiera ya está bien, pero mal usada:** A nivel de base de datos, el sistema ya logró separar el dinero en una tabla exclusiva llamada `CustomerAccount`[cite: 10]. Sin embargo, la interfaz no está aprovechando esta limpieza.

## 2. La Propuesta de Solución 
Vamos a transformar este módulo en un verdadero CRM (Customer Relationship Management) limpio y profesional:

1. **Directorio Maestro Unificado (`/customers`):**
   * Una única página donde están **todos** los clientes registrados.
   * Columnas limpias: `Nombre`, `CI`, `Teléfono`, y un `Badge visual` que indique el tipo de cliente (Regular, Prepago, Postpago). ¡Nada de puntos ni dinero aquí!
2. **Panel Lateral / Ficha del Cliente (Slide-over):**
   * Al hacer clic en cualquier cliente de la lista, se desliza un panel lateral (o se abre un modal estructurado).
   * Dentro de esta ficha, la información se divide en pestañas:
     * *Tab 1: Identidad* (Editar nombre, teléfono).
     * *Tab 2: Lealtad* (Aquí se ven sus puntos, visitas, y nivel).
     * *Tab 3: Cuenta Financiera*. Si es un cliente regular, aquí habrá un botón grande: **"Ascender a Pensionado"**. Si ya es pensionado, aquí se verán sus botones de recarga, pago de deuda y su historial de movimientos (`LedgerDialog`).
3. **Refactorización final de la Base de Datos:**
   * Así como el dinero se movió a `CustomerAccount`[cite: 10], debemos extraer `totalVisits`, `totalSpent` y `points` a un nuevo modelo `CustomerLoyalty` para que la tabla principal de `Customer` quede 100% dedicada a la identidad.

---

## 3. INSTRUCCIONES PARA OPENCODE

**Contexto y Objetivo:**
Actúa como un Lead Product Engineer. Tras analizar el `REPORTE-ESTADO-CLIENTES.md`, he detectado que aunque la base de datos ya separó la entidad financiera (`CustomerAccount`), la UI tiene graves problemas de Experiencia de Usuario: segmenta artificialmente a los usuarios en `/customers` y `/pensionados`, y satura la tabla principal con métricas de lealtad (puntos, gastos).

**Requerimiento: Rediseño del Módulo de Clientes (Visión CRM)**
Por favor, refactoriza el módulo de clientes siguiendo estos pasos estrictos:

1. **Completar la Normalización (Prisma):**
   - Extrae los campos `totalVisits`, `totalSpent`, `points`, y `lastVisitAt` de la tabla `Customer` hacia un nuevo modelo `CustomerLoyalty` (Relación 1:1 con `Customer`, donde se cree automáticamente por defecto). Genera la migración necesaria para trasladar los datos existentes.

2. **Unificar el Directorio Maestro (`apps/admin/app/(dashboard)/customers`):**
   - Elimina la separación entre rutas. La ruta `/customers` debe mostrar **TODOS** los clientes sin importar si tienen cuenta o no.
   - Limpia la tabla: Las columnas deben ser únicamente `Nombre`, `CI`, `Teléfono`, y un `Estado/Tipo` (Badge que diga Mostrador, Prepago o Postpago). Elimina las columnas de visitas, puntos, saldos y gastos de esta vista principal.

3. **Crear la "Ficha del Cliente" (Panel/Drawer):**
   - Al hacer clic en una fila o en el botón "Ver detalle" de un cliente en la tabla, abre un componente tipo Drawer (o un modal estructurado con Tabs).
   - **Tab 1 (Lealtad):** Muestra el nivel, puntos, visitas y gasto (conectado a `CustomerLoyalty`).
   - **Tab 2 (Finanzas/Pensionado):** 
     - Si `account === null`: Muestra un CTA "Ascender a Pensionado" (que abre el flujo para crear el `CustomerAccount`).
     - Si tiene cuenta: Muestra el saldo, límite, tabla del ledger, y los botones de "Recargar / Pagar Deuda".

4. **Limpieza de Rutas:**
   - La ruta `/pensionados` debe ser eliminada del menú principal, ya que toda su funcionalidad (crear cuenta, ver saldo, recargar) ahora vivirá dentro de la "Ficha del Cliente" en `/customers`.

Por favor, implementa esta refactorización paso a paso. Comienza mostrándome los cambios en `schema.prisma` y confirmando cómo abordarás la UI antes de reescribir los componentes.