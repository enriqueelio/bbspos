# Spec Delta

## ADDED Requirements

### Requirement: Contador de unidades en la tarjeta de almuerzo

La grilla de almuerzos del día del terminal del cajero SHALL mostrar en la esquina superior derecha de cada tarjeta de plato la cantidad disponible de la jornada, con el mismo lenguaje visual que los números de acceso directo del catálogo. El sistema SHALL mostrar un guion cuando el plato aún no tiene cantidad, el número de unidades disponibles en estado normal, el número en rojo cuando llegue al umbral de aviso, y el número real en gris cuando no quede ninguna, mostrando la diferencia cuando la venta haya superado lo disponible. El umbral de aviso SHALL ser de cinco unidades por defecto.

Un almuerzo del día SHALL bloquearse, sin agregar el plato al ticket en curso, mientras no se le haya asignado una cantidad para la jornada, cuando ya no le quede ninguna unidad, o cuando las unidades que le quedan ya estén todas en el ticket de esa misma caja. En los tres casos la tarjeta SHALL verse en gris y SHALL distinguir el motivo: **sin cantidad** cuando todavía no se le asignó ninguna, **agotada** cuando se le asignó y ya no queda ninguna, y **en tu ticket** cuando lo que queda ya lo tiene esa caja. El número de esas tarjetas SHALL seguir siendo interactivo, para que el cajero pueda asignar la cantidad o reponer unidades y rehabilitar la tarjeta.

Hacer clic sobre el número de la tarjeta SHALL abrir un menú emergente cuya única operación sea **sumar o restar unidades** de la cantidad de la jornada: pasos rápidos, un campo para escribir las unidades y los botones de restar y sumar. La primera suma sobre un plato que aún no tiene cantidad SHALL establecerla como base. El menú SHALL cerrarse al hacer clic fuera o al confirmar, y los cambios SHALL reflejarse en la tarjeta sin requerir recargar la página. Cuando la reposición devuelva unidades disponibles, la tarjeta SHALL volver a estar habilitada de inmediato, sin esperar el refresco del catálogo. El menú SHALL abrirse siempre dentro de la columna del catálogo, sin quedar tapado por el panel del ticket en curso.

#### Scenario: Almuerzo sin cantidad

- **WHEN** un plato del Menú del Día no tiene cantidad asignada para la jornada
- **THEN** su tarjeta muestra un guion, se ve en gris marcada como sin cantidad y el sistema no agrega el plato al ticket en curso

#### Scenario: El cajero asigna la cantidad de un plato sin cantidad

- **WHEN** el cajero suma unidades sobre el número de un plato del Menú del Día que no tenía cantidad
- **THEN** esa cantidad queda como base y la tarjeta se habilita de inmediato para vender el plato

#### Scenario: Almuerzo con unidades disponibles

- **WHEN** un plato del Menú del Día tiene unidades disponibles por encima del umbral de aviso
- **THEN** su tarjeta muestra la cantidad disponible en la esquina superior derecha, junto al nombre y al precio

#### Scenario: Pocas unidades

- **WHEN** a un plato del Menú del Día le quedan cinco unidades o menos
- **THEN** el número de su tarjeta se muestra en rojo

#### Scenario: Almuerzo agotado

- **WHEN** a un plato del Menú del Día no le queda ninguna unidad disponible
- **THEN** su tarjeta se muestra en gris y marcada como agotada, y el sistema no agrega el plato al ticket en curso

#### Scenario: El cajero repone desde el número agotado

- **WHEN** el cajero repone unidades sobre el número de un plato agotado
- **THEN** la tarjeta vuelve a estar habilitada y a permitir agregar el plato de inmediato, con el nuevo número visible

#### Scenario: Reponer no alcanza

- **WHEN** el cajero repone unidades y la cantidad disponible sigue en cero o menos
- **THEN** la tarjeta permanece agotada y sin permitir la venta

#### Scenario: El cajero ajusta la cantidad

- **WHEN** el cajero suma o resta unidades sobre el número de un plato del Menú del Día
- **THEN** el sistema registra el ajuste con su autor y la tarjeta muestra la nueva cantidad disponible

#### Scenario: El cajero programa la cantidad del día

- **WHEN** el cajero suma por primera vez unidades sobre un plato del Menú del Día que no tenía cantidad
- **THEN** esa cantidad queda como base y la tarjeta pasa a mostrar la cantidad disponible calculada sobre ella

#### Scenario: El menú no tapa el ticket

- **WHEN** el cajero abre el menú de unidades sobre una tarjeta de la primera columna
- **THEN** el menú se muestra completo dentro de la columna del catálogo, sin quedar oculto detrás del panel del ticket en curso

#### Scenario: Lo que queda ya está en mi propio ticket

- **WHEN** una caja tiene en su ticket todas las unidades que le quedan disponibles de un plato del Menú del Día
- **THEN** la tarjeta se muestra en gris marcada como "en tu ticket" y no admite más unidades, y vuelve a admitirlas cuando el cajero libera alguna línea

#### Scenario: El número se actualiza solo

- **WHEN** otro terminal o una venta ajena modifican la cantidad disponible de un plato del Menú del Día
- **THEN** la tarjeta del terminal del cajero refleja el nuevo valor sin que el cajero recargue la página

#### Scenario: Chocan dos cajas por la última unidad

- **WHEN** el cajero hace clic en un plato del Menú del Día que ya no tiene unidades disponibles, aunque su tarjeta todavía se lo mostrara como disponible
- **THEN** el servidor rechaza el clic, el plato no se agrega al ticket y el cajero recibe un aviso de que otra caja se lo llevó, con el número ya actualizado

### Requirement: El número del ticket y el apartado van juntos

El panel del ticket en curso SHALL mover el cupo junto con la cantidad: al subir la cantidad de un plato del Menú del Día SHALL apartar las unidades para esa caja y, si ya no alcanzan, SHALL dejar la cantidad como estaba e informar al cajero; al bajar la cantidad o al quitar la línea SHALL devolver las unidades apartadas. Al confirmar el pedido, los apartados de la caja SHALL convertirse en unidades vendidas, y al limpiar el ticket SHALL soltarse todo lo que estuviera apartado.

#### Scenario: Subir la cantidad en el panel del ticket

- **WHEN** el cajero sube la cantidad de un plato del Menú del Día en el panel del ticket y las unidades están disponibles
- **THEN** la línea queda con la nueva cantidad y esas unidades quedan apartadas para esa caja

#### Scenario: Subir la cantidad cuando otra caja se lo llevó

- **WHEN** el cajero sube la cantidad de un plato del Menú del Día y ya no quedan unidades disponibles
- **THEN** la línea conserva su cantidad anterior y el cajero recibe el aviso de que otra caja lo tomó

#### Scenario: Limpiar el ticket

- **WHEN** el cajero limpia el ticket en curso
- **THEN** los apartados de esa caja se liberan y las demás cajas vuelven a ver las unidades como disponibles

#### Scenario: Reabrir el POS con el ticket a medias

- **WHEN** el POS se reabre y el ticket del navegador todavía tiene líneas de almuerzo
- **THEN** el sistema renueva los apartados vigentes de esa caja y, si alguna línea ya no puede apartarse porque otra caja se la llevó, avisa al cajero para que la quite del ticket antes de cobrar
