## MODIFIED Requirements

### Requirement: Contador de unidades en la tarjeta de almuerzo

La grilla de almuerzos del día del terminal del cajero SHALL mostrar en la esquina superior derecha de cada tarjeta de plato las unidades que esa caja todavía puede agregar, es decir la cantidad disponible de la jornada menos las que ya tiene apartadas en su propio ticket. Ese número SHALL ser el único número en esa esquina de la tarjeta, para que se lea como la cantidad de almuerzo y no como otra cosa del catálogo. El número SHALL bajar en uno cada vez que el cajero agrega una unidad a su ticket y SHALL subir en uno cada vez que la quita, sin que el cajero tenga que recargar la página. El sistema SHALL mostrar un guion cuando el plato aún no tiene cantidad, el número de unidades agregables en estado normal, el número en rojo cuando llegue al umbral de aviso, y el número real en gris cuando no quede ninguna, mostrando la diferencia cuando la venta haya superado lo disponible. El umbral de aviso SHALL ser de cinco unidades, y el sistema no SHALL ofrecer ninguna vía para cambiarlo desde el POS ni desde el admin.

Un almuerzo del día SHALL bloquearse, sin agregar el plato al ticket en curso, mientras no se le haya asignado una cantidad para la jornada, cuando ya no le quede ninguna unidad, o cuando las unidades que le quedan ya estén todas en el ticket de esa misma caja. En los tres casos la tarjeta SHALL verse en gris y SHALL distinguir el motivo: **sin cantidad** cuando todavía no se le asignó ninguna, **agotada** cuando se le asignó y ya no queda ninguna, y **en tu ticket** cuando lo que queda ya lo tiene esa caja. El bloqueo por cupo propio SHALL aplicarse sin depender del refresco del catálogo. El número de esas tarjetas SHALL seguir siendo interactivo, para que el cajero pueda asignar la cantidad o reponer unidades y rehabilitar la tarjeta.

Cuando el servidor rechace el alta de un plato por cupo, SHALL distinguir el motivo: si las unidades están apartadas por la propia caja, el aviso SHALL decir que ya las tiene todas en su ticket; si las unidades disponibles fueron tomadas por otra caja, el aviso SHALL decir que otra caja se las llevó. En ambos casos la línea SHALL quedar fuera del ticket y el número de la tarjeta SHALL quedar al día.

Hacer clic sobre el número de la tarjeta SHALL abrir un menú emergente cuya única operación sea **sumar o restar unidades** de la cantidad de la jornada: pasos rápidos, un campo para escribir las unidades y los botones de restar y sumar. La primera suma sobre un plato que aún no tiene cantidad SHALL establecerla como base. El menú SHALL cerrarse al hacer clic fuera o al confirmar, y los cambios SHALL reflejarse en la tarjeta sin requerir recargar la página. Cuando la reposición devuelva unidades disponibles, la tarjeta SHALL volver a estar habilitada de inmediato, sin esperar el refresco del catálogo. El menú SHALL abrirse siempre dentro de la columna del catálogo, sin quedar tapado por el panel del ticket en curso.

#### Scenario: Almuerzo sin cantidad

- **WHEN** un plato del Menú del Día no tiene cantidad asignada para la jornada
- **THEN** su tarjeta muestra un guion, se ve en gris marcada como sin cantidad y el sistema no agrega el plato al ticket en curso

#### Scenario: El cajero asigna la cantidad de un plato sin cantidad

- **WHEN** el cajero suma unidades sobre el número de un plato del Menú del Día que no tenía cantidad
- **THEN** esa cantidad queda como base y la tarjeta se habilita de inmediato para vender el plato

#### Scenario: Almuerzo con unidades disponibles

- **WHEN** un plato del Menú del Día tiene unidades disponibles por encima del umbral de aviso y esa caja no tiene ninguna apartada en su ticket
- **THEN** su tarjeta muestra la cantidad disponible en la esquina superior derecha, junto al nombre y al precio

#### Scenario: El número de la tarjeta no se confunde con otro dato

- **WHEN** el cajero mira la tarjeta de un plato del Menú del Día
- **THEN** el único número en su esquina superior derecha es el de las unidades agregables, sin ningún otro número de la barra de secciones en la misma posición

#### Scenario: Pocas unidades

- **WHEN** a un plato del Menú del Día le quedan cinco unidades o menos
- **THEN** el número de su tarjeta se muestra en rojo

#### Scenario: El umbral de aviso no se configura

- **WHEN** el personal busca cambiar el umbral a partir del cual el número de la tarjeta se pone en rojo
- **THEN** ninguna terminal ni el admin ofrecen una vía para cambiarlo y el aviso sigue produciéndose a las cinco unidades

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

#### Scenario: El número baja al agregar una unidad

- **WHEN** el cajero agrega una unidad de un plato del Menú del Día a su ticket en curso
- **THEN** el número de la tarjeta baja en uno de inmediato, sin esperar el refresco del catálogo

#### Scenario: El número sube al quitar una línea

- **WHEN** el cajero quita del ticket una línea de un plato del Menú del Día
- **THEN** el número de la tarjeta sube en uno de inmediato y la tarjeta vuelve a admitir esa unidad

#### Scenario: Lo que queda ya está en mi propio ticket

- **WHEN** una caja tiene en su ticket todas las unidades que le quedan disponibles de un plato del Menú del Día
- **THEN** el número de la tarjeta llega a cero de inmediato, la tarjeta se muestra en gris marcada como "en tu ticket" y no admite más unidades, y vuelve a admitirlas cuando el cajero libera alguna línea

#### Scenario: El número se actualiza solo

- **WHEN** otro terminal o una venta ajena modifican la cantidad disponible de un plato del Menú del Día
- **THEN** la tarjeta del terminal del cajero refleja el nuevo valor sin que el cajero recargue la página

#### Scenario: Chocan dos cajas por la última unidad

- **WHEN** el cajero hace clic en un plato del Menú del Día que ya no tiene unidades disponibles, aunque su tarjeta todavía se lo mostrara como disponible
- **THEN** el servidor rechaza el clic, el plato no se agrega al ticket y el cajero recibe un aviso de que otra caja se lo llevó, con el número ya actualizado

#### Scenario: El cupo lo cubre el propio ticket

- **WHEN** el cajero intenta agregar una unidad de un plato del Menú del Día cuyas unidades disponibles ya están todas apartadas por su propio ticket
- **THEN** el servidor rechaza el alta, la línea no se agrega al ticket y el aviso dice que ya las tiene todas en su ticket, en vez de culpar a otra caja

## ADDED Requirements

### Requirement: POS conducido con el mouse

La vista de Nueva Venta del terminal del cajero SHALL conducirse con el mouse: SHALL NOT registrar ningún atajo de teclado global que cambie de sección del catálogo ni que dispare el cobro, y la barra de secciones del catálogo SHALL cambiar de sección únicamente al hacer clic en la tarjeta de la sección. Las tarjetas de la barra SHALL NOT mostrar numeritos de tecla, ni ninguna otra marca que sugiera que su sección se puede elegir con el teclado. La tarjeta de sección SHALL mantener su mismo aspecto al apretar cualquier tecla, sin que aparezca un borde de otro color: el sistema SHALL NOT dibujar el anillo de foco del navegador sobre ella. El cobro SHALL quedar a cargo del botón de cobro del ticket en curso, que SHALL seguir validando el nombre del cliente y el tipo de entrega antes de enviar el pedido.

El sistema SHALL NOT eliminar el uso del teclado donde no obliga a soltar el mouse: la escritura en los campos de texto SHALL seguir funcionando con normalidad, `Enter` en el campo de nombre del cliente SHALL seguir aceptando el nombre escrito, `Escape` SHALL seguir cerrando los menús emergentes y el popover del contador, y la grilla del arqueo de caja SHALL conservar su navegación por teclado.

#### Scenario: Las teclas de número no cambian de sección

- **WHEN** el cajero presiona una tecla numérica sobre la vista de Nueva Venta
- **THEN** la sección activa del catálogo no cambia y el teclado no produce ninguna otra acción en la pantalla

#### Scenario: La barra de secciones no muestra numeritos

- **WHEN** el cajero mira la barra de secciones del catálogo
- **THEN** cada tarjeta muestra solo su ícono y su nombre, sin ningún número ni marca de tecla de acceso rápido

#### Scenario: El borde de la sección no cambia al apretar una tecla

- **WHEN** el cajero elige una sección con el clic y después aprieta cualquier tecla del teclado
- **THEN** la tarjeta de esa sección mantiene exactamente el mismo borde y color, sin que aparezca un anillo de foco de otro color, y la sección activa sigue siendo la elegida con el clic

#### Scenario: El cobro es solo con el botón del ticket

- **WHEN** el cajero tiene productos en el ticket en curso y presiona Enter
- **THEN** no se cobra el pedido y el cobro solo ocurre al hacer clic en el botón de cobro del ticket en curso

#### Scenario: Se cobra igual con el botón

- **WHEN** el cajero completa nombre y tipo de entrega y hace clic en el botón de cobro del ticket
- **THEN** el pedido se envía igual que antes y no depende de ninguna tecla

#### Scenario: El teclado sigue escribiendo en los campos

- **WHEN** el cajero escribe el nombre del cliente y presiona Enter en ese campo
- **THEN** el nombre se acepta y se cierra el desplegable de sugerencias, como antes de quitar los atajos
