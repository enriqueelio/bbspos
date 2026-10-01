# INSTRUCCIONES PARA OPENCODE

Actúa como un Desarrollador Full-Stack Senior. A continuación te proporciono un Documento de Requisitos de Producto (PRD) y Diagnóstico elaborado por un Lead Product Designer. 

Tu tarea es leer este documento a fondo, entender la nueva regla de negocio ("Los pensionados POSTPAGO no tienen fidelización") y prepararte para refactorizar el código del sistema BBSPOS según las propuestas detalladas. 

Por favor, confirma que has entendido el plan y pregúntame por qué archivo quieres empezar a aplicar los cambios.

---

# PLAN DE REFACTORIZACIÓN: MÓDULO DE LEALTAD Y PENSIONADOS

## 1. Diagnóstico de Problemas Actuales

* **Fallo lógico y distorsión financiera:** El sistema de cobro (`accumulateCustomerLoyalty`) otorga puntos, visitas y gasto acumulado a los clientes "Postpago" de manera idéntica a los de mostrador o prepago. Esto provoca que el ranking de "Clientes frecuentes" sume la deuda acumulada y la clasifique erróneamente como ingreso.
* **Fricción operativa:** Al crear/editar un usuario, el administrador puede seleccionar la modalidad "POSTPAGO" sin recibir ninguna advertencia de que esto desactiva la fidelización.
* **Riesgo de fondos perdidos:** La acción `addCustomerFunds` carece de una validación `isPension`. Esto permite recargar saldo a clientes normales de mostrador (plata que queda atrapada).
* **Carga cognitiva en estados de cuenta:** La tabla principal muestra el saldo de Prepago y Postpago en la misma columna sin etiquetas textuales claras. El `LedgerDialog` no muestra el `orderId` ni el saldo resultante tras cada transacción.
* **Fuga de beneficios:** La acción `redeemCustomerPoints` permite a clientes postpago canjear puntos.

## 2. Propuesta de Flujo Optimizado (Requisitos Técnicos)

* **Bifurcación en el motor de lealtad:** Modificar `acceptPensionOrder`. La función `accumulateCustomerLoyalty` SOLO debe ejecutarse si `pensionType !== POSTPAGO`. El postpago solo registra el consumo en el ledger (deuda) y termina.
* **Separación de Rankings:** Refactorizar `getCustomerRanking`. El ranking actual debe filtrar y contar EXCLUSIVAMENTE pedidos cobrados en efectivo, QR o saldo prepago. 
* **UI Preventiva (Admin):** En `CustomerFormDialog`, al seleccionar `POSTPAGO`, mostrar una alerta inline: *"El pensionado Postpago no acumula puntos ni nivel. Solo el Prepago es fidelizado"*. En la tabla, añadir un badge de "Sin fidelización" a los postpagos.
* **Mejora del Ledger:** Añadir el `orderId` al historial de movimientos y distinguir visualmente "Saldo a Favor" (Prepago) de "Deuda" (Postpago).
* **Script de Corrección:** Crear un script (`fix:postpago-loyalty`) que resetee a 0 los contadores (`totalVisits`, `totalSpent`, `points`) de todos los clientes que actualmente sean POSTPAGO.

## 3. User Flow y Lógica Esperada

**Flujo 1: Creación de Cliente (apps/admin)**
[Formulario] -> [Toggle "Es Pensionado"] -> [Modalidad]
 ├── PREPAGO -> Input de recarga inicial + Mensaje "Elegible para programa de lealtad".
 └── POSTPAGO -> Input de Límite de Crédito + Alerta: "Los clientes postpago no generan puntos ni suben de nivel".

**Flujo 2: Proceso de Cobro (apps/cajero)**
[Armado de Pedido] -> [Cobrar a cuenta]
 ├── Escenario Prepago -> Actualiza Ledger -> Dispara `accumulateCustomerLoyalty()` -> +1 Visita, +Puntos.
 └── Escenario Postpago -> Actualiza Ledger (Suma Deuda) -> FIN DEL FLUJO (Bypass del motor de lealtad).

## 4. Métricas Técnicas de Éxito a Garantizar
* Tasa de deuda postpago reflejada en el Top 10 de "Clientes Frecuentes" = 0%.
* Tasa de recargas accidentales a `isPension=false` = 0% (Bloqueo en el backend).
* Prevención total de redención de puntos (`redeemCustomerPoints`) para usuarios Postpago.