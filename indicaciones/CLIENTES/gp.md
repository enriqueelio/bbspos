# Propuesta de arquitectura UX — Clientes, Cuentas Pensionadas y Lealtad

## 1. Diagnóstico

El problema principal no es solo qué columnas mostrar. La experiencia está tratando como poblaciones separadas a **Clientes** y **Pensionados**, cuando el modelo de datos ya representa una relación más natural: `Customer` es la persona y `CustomerAccount` es la condición/cuenta financiera asociada. fileciteturn6file0L12-L28

Un cliente que pasa a pensionado **no debería desaparecer de la página Clientes**.

El modelo correcto debe ser:

```text
CLIENTE
= quién es

CUENTA PENSIONADA
= qué tratamiento financiero tiene

LEALTAD
= qué tan fiel es
```

---

## 2. CLIENTES debe ser el maestro único de personas

La página `/customers` debe contener **todos los clientes**:

- clientes de mostrador;
- pensionados PREPAGO;
- pensionados POSTPAGO.

Debe responder:

> **¿Quién es este cliente y cómo está configurado?**

### Tabla recomendada

| Cliente | CI | Teléfono | Estado | Acción |
|---|---|---|---|---|
| María Fernández | 1234 | 7xxxxxx | Cliente | Ver |
| Ronald Paz | 5678 | 7xxxxxx | Pensionado · Postpago | Ver |
| Andrés | 9012 | 7xxxxxx | Pensionado · Prepago | Ver |

### No mostrar en esta tabla

No mezclar aquí:

- visitas;
- gasto total;
- puntos;
- última visita;
- nivel;
- ranking;
- ticket promedio;
- deuda detallada;
- movimientos.

Esos datos pertenecen a otras responsabilidades.

El hecho de que `Customer` conserve datos/cache de lealtad no significa que tengan que aparecer en la tabla principal. fileciteturn6file0L66-L72

---

## 3. Estado visual

Cliente normal:

```text
Cliente
```

Pensionado:

```text
Pensionado · Prepago
```

o:

```text
Pensionado · Postpago
```

El cliente sigue siendo la misma persona. Solo cambia su estado.

---

## 4. CUENTAS PENSIONADAS debe ser gestión financiera

No recomiendo eliminar `/pensionados`; recomiendo cambiar su significado.

Debe convertirse en:

> **Gestión de cuentas pensionadas**

Pregunta que responde:

> **¿Qué clientes tienen una cuenta pensionada y cómo administramos esa cuenta?**

### Tabla recomendada

| Cliente | Modalidad | Saldo/Deuda | Límite | Acciones |
|---|---|---:|---:|---|
| Ronald Paz | Postpago | Deuda 290 Bs | 500 Bs | Gestionar |
| María López | Prepago | Saldo 150 Bs | — | Gestionar |

Aquí sí deben aparecer:

- saldo;
- deuda;
- límite;
- recargar;
- pagar deuda;
- movimientos;
- cambiar modalidad;
- gestionar cuenta.

Esto corresponde a `CustomerAccount`, que actualmente es la fuente de verdad financiera. fileciteturn6file0L14-L28

---

## 5. LEALTAD / FRECUENTES

Debe concentrar exclusivamente:

- visitas;
- gasto;
- puntos;
- nivel;
- última visita;
- ranking;
- reglas de beneficio;
- canjes.

Pregunta:

> **¿Qué tan fiel es este cliente?**

Así se evita mezclar identidad, finanzas y analítica.

---

## 6. Ficha individual del cliente

La pieza clave que falta es una **Ficha del Cliente**.

Al hacer clic en un cliente desde `/customers`, debe abrirse una vista de esa persona, no enviarlo a otra lista.

### Ejemplo

```text
RONALD PAZ

CI: 12345678
Teléfono: 70000000
Dirección: ...

ESTADO
Pensionado · Postpago

[Gestionar cuenta] [Editar cliente]
```

Debajo:

```text
[Resumen] [Cuenta] [Historial] [Lealtad]
```

La ficha es donde sí pueden convivir las distintas dimensiones del cliente.

---

## 7. Cliente normal → Pensionado

El proceso debe empezar desde **Clientes**.

No:

```text
Clientes
  ↓
sacar cliente
  ↓
ir a Pensionados
  ↓
crear pensionado
```

Sí:

```text
Clientes
  ↓
Buscar cliente
  ↓
Abrir ficha
  ↓
[Activar cuenta pensionada]
  ↓
Elegir Prepago / Postpago
  ↓
Configurar condiciones
  ↓
Guardar
  ↓
El cliente permanece en CLIENTES
```

El backend ya dispone de `convertToPensionado(customerId, data)`, que crea la cuenta asociada al cliente. fileciteturn6file0L94-L104

---

## 8. Cambiar el lenguaje de “Convertir”

Recomiendo usar:

> **Activar cuenta pensionada**

en lugar de:

> **Convertir a pensionado**

Porque el cliente no deja de ser cliente. Se activa una relación financiera especial.

Ejemplo:

```text
RONALD PAZ
Cliente

[Activar cuenta pensionada]
```

Después:

```text
RONALD PAZ
Pensionado · Postpago

[Gestionar cuenta pensionada]
```

---

## 9. Lealtad

Regla consolidada:

### Mostrador
Sí fideliza.

### Prepago
Sí fideliza.

### Postpago
No fideliza.

El backend actual ya implementa esta separación mediante `isFidelizable` y excluye consumos POSTPAGO. fileciteturn6file0L48-L78

No recomiendo mostrar a un Postpago:

```text
0 puntos
0 visitas
0 gasto
Sin nivel
```

Eso crea ruido.

Mejor:

```text
RONALD PAZ
Pensionado · Postpago

Cuenta:
Deuda 290 Bs
```

---

## 10. Distribución definitiva

### CLIENTES — Identidad + estado

```text
Nombre
CI
Teléfono
Dirección
Estado
Modalidad pensionada
Acciones
```

### CUENTAS PENSIONADAS — Operación financiera

```text
Cliente
Prepago/Postpago
Saldo
Deuda
Límite
Movimientos
Recargar
Pagar deuda
Cambiar modalidad
```

### LEALTAD / FRECUENTES — Analítica comercial

```text
Visitas
Gasto
Puntos
Nivel
Última visita
Ranking
Reglas
Canjes
```

### FICHA DEL CLIENTE — Contexto individual

```text
Identidad
Estado
Cuenta
Historial
Lealtad
```

---

## 11. Navegación

```text
CONFIGURACIÓN

Clientes
Cuentas pensionadas
Lealtad / Frecuentes
```

Responsabilidades:

```text
CLIENTES
→ Todas las personas.

CUENTAS PENSIONADAS
→ Solo cuentas activas de clientes que tienen tratamiento pensionado.

LEALTAD / FRECUENTES
→ Analítica de comportamiento y fidelización.
```

Un pensionado aparece tanto en **Clientes** como en **Cuentas pensionadas**, porque son dos vistas de la misma persona y de su cuenta.

No son dos clientes.

---

## 12. Flujo ideal

### Cliente nuevo

```text
Clientes
   ↓
[Nuevo cliente]
   ↓
Nombre + CI + teléfono + dirección
   ↓
Guardar
   ↓
Cliente normal
```

### Cliente que pasa a pensionado

```text
Clientes
   ↓
Buscar Ronald Paz
   ↓
Abrir ficha
   ↓
[Activar cuenta pensionada]
   ↓
Prepago / Postpago
   ↓
Configurar saldo / límite
   ↓
Guardar
   ↓
RONALD PAZ
Pensionado · Postpago
```

### Gestión financiera

```text
Clientes
   ↓
Ronald Paz
   ↓
[Gestionar cuenta]
   ↓
Cuentas pensionadas
   ↓
Deuda / pagos / movimientos
```

### Lealtad

```text
Clientes
   ↓
Lealtad / Frecuentes
   ↓
Ranking / puntos / niveles
```

---

## 13. Wireframe de `/customers`

```text
┌──────────────────────────────────────────────────────────────────────┐
│ CLIENTES                                                             │
│                                                                      │
│ [ + Nuevo cliente ]                                                  │
│                                                                      │
│ Buscar por nombre, CI o teléfono...                    🔍            │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ Nombre              CI          Teléfono       Estado        Acción │
├──────────────────────────────────────────────────────────────────────┤
│ MARIA FERNANDEZ     123456      70000000       Cliente       Ver    │
│ ANDRES PEREZ        654321      71111111       Cliente       Ver    │
│ RONALD PAZ          987654      72222222       Pensionado     Ver    │
│                                                Postpago              │
│ JUAN LOPEZ          444444      73333333       Pensionado     Ver    │
│                                                Prepago               │
└──────────────────────────────────────────────────────────────────────┘
```

La tabla principal queda deliberadamente limpia.

---

## 14. Qué NO recomiendo

### No mezclar en Clientes

```text
Nombre | CI | Teléfono | Visitas | Gasto | Puntos | Nivel | Última visita
```

Porque convierte Clientes en reporte.

### No sacar pensionados de Clientes

Eso rompe el concepto de identidad única.

### No crear un segundo registro para el mismo cliente

Un pensionado debe seguir siendo el mismo `Customer`.

### No usar Pensionados como otro maestro de clientes

Debe ser una herramienta de gestión de `CustomerAccount`.

### No mostrar “0 puntos / 0 visitas” para Postpago

El Postpago no necesita una ausencia de métricas presentada como si fuera una deficiencia.

---

## 15. Relación con el modelo actual

La propuesta no requiere cambiar el concepto fundamental de la base.

Actualmente:

```text
Customer
   │
   └── CustomerAccount (0..1)
           │
           └── CustomerLedger
```

y:

```text
Order
   └── accountId
```

para pedidos PENSION. fileciteturn6file0L12-L28

Por eso el trabajo principal es **reorganizar la experiencia**, no inventar nuevas entidades.

---

## 16. Conclusión

La solución recomendada es:

```text
                 CLIENTE
                    │
          ┌─────────┼─────────┐
          │         │         │
          ▼         ▼         ▼
      Identidad   Cuenta    Lealtad
                  pensionada
```

En términos de producto:

```text
CLIENTES
→ quién es

CUENTAS PENSIONADAS
→ cómo manejamos su cuenta

LEALTAD / FRECUENTES
→ qué tan fiel es
```

La decisión más importante es:

> **Un cliente pensionado NO deja de ser cliente.**

Cuando pasa a pensionado, su registro permanece en la página principal de Clientes y simplemente cambia su estado:

```text
Cliente
   ↓
Pensionado · Prepago
```

o:

```text
Cliente
   ↓
Pensionado · Postpago
```

La información financiera se gestiona desde **Cuentas Pensionadas**, y la analítica de comportamiento desde **Lealtad / Frecuentes**.

Esta estructura aprovecha la separación que el backend ya implementó entre `Customer` y `CustomerAccount`, evitando mezclar identidad, finanzas y reportes en una sola pantalla. fileciteturn6file0L19-L28
