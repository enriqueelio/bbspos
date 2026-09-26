# Pos Terminal Specification

## Purpose

Terminal POS táctil de dos columnas para la toma de pedidos en la app del cajero — permite a meseros y cajeros seleccionar productos por categoría/sabor/tamaño/boba/toppings, gestionar un ticket en curso, y enviar pedidos con tipo de entrega MESA o LLEVAR.

## Requirements

### Requirement: Layout de tres columnas de la venta

El terminal POS del cajero SHALL mostrar un layout de tres columnas en la vista de Nueva Venta que comparte la altura visible de la pantalla: la cola de pedidos a la izquierda (~20 %, con scroll propio y barra de scroll oculta), el ticket en curso al centro (~20 %, con área de pago fija al fondo) y el catálogo de productos a la derecha (~60 %, con scroll propio). Las columnas SHALL redimensionarse fluidamente y conservar su estructura en resoluciones menores.

#### Scenario: Layout con cola visible mientras se toma el pedido

- **WHEN** el cajero arma un pedido en Nueva Venta y existen pedidos en la cola
- **THEN** ve simultáneamente cola, ticket en curso y catálogo, y puede preparar o cobrar sin cambiar de pestaña

#### Scenario: Layout en pantalla grande

- **WHEN** el dispositivo tiene una pantalla con ancho mayor a 1024px
- **THEN** el terminal muestra las tres columnas lado a lado — cola a la izquierda, ticket al centro, catálogo a la derecha

#### Scenario: Columnas con ancho mínimo propio

- **WHEN** la resolución se reduce por debajo de 1024px
- **THEN** las columnas conservan sus anchos mínimos y cada una hace scroll propio sin desbordes horizontales del conjunto

### Requirement: Selector de categorías y sabores

El terminal SHALL mostrar una fila de botones de categorías (ej: ESPECIALES, CON AGUA, CON LECHE) y una cuadrícula de sabores disponibles para la categoría seleccionada. Las categorías sin sabores disponibles SHALL estar deshabilitadas con opacidad reducida.

#### Scenario: Selección de categoría

- **WHEN** el usuario toca una categoría
- **THEN** la categoría se resalta con color primario y la cuadrícula de sabores muestra los sabores disponibles para esa categoría

#### Scenario: Categoría sin sabores

- **WHEN** una categoría no tiene sabores disponibles
- **THEN** el botón de categoría está deshabilitado con opacidad al 30%

### Requirement: Selector de tamaño y tipo de boba

El terminal SHALL mostrar selectores de tamaño (Grande/Extragrande) y tipo de boba (Tapioca/Explosivas) como botones táctiles en cuadrícula de dos columnas. Ambos son obligatorios antes de confirmar un producto.

#### Scenario: Selección incompleta

- **WHEN** el usuario ha seleccionado un sabor pero no ha seleccionado tamaño o tipo de boba
- **THEN** el botón "Confirmar producto" está deshabilitado

#### Scenario: Selección completa

- **WHEN** el usuario ha seleccionado sabor, tamaño y tipo de boba
- **THEN** el botón "Confirmar producto" se habilita y muestra el subtotal calculado

### Requirement: Selector de toppings opcionales

El terminal SHALL mostrar una fila de botones de toppings extra que el usuario puede activar/desactivar como selección múltiple. Cada topping muestra su nombre y precio adicional.

#### Scenario: Agregar topping

- **WHEN** el usuario toca un topping no seleccionado
- **THEN** el topping se resalta y su precio se agrega al subtotal del producto en progreso

#### Scenario: Quitar topping

- **WHEN** el usuario toca un topping ya seleccionado
- **THEN** el topping se deselecciona y su precio se resta del subtotal

### Requirement: Pre-ticket del producto en progreso

El terminal SHALL mostrar un área de pre-ticket que aparece solo cuando hay un sabor seleccionado, mostrando: nombre del sabor, tamaño + tipo de boba, lista de toppings, subtotal, y botón "Confirmar producto".

#### Scenario: Producto en progreso

- **WHEN** el usuario ha seleccionado un sabor
- **THEN** aparece el pre-ticket con el resumen del producto que se está armando

#### Scenario: Confirmar producto

- **WHEN** el usuario toca "Confirmar producto" teniendo tamaño y boba seleccionados
- **THEN** el producto se agrega al ticket en curso, los selectores se resetean para el siguiente producto, y el pre-ticket desaparece

### Requirement: Ticket en curso

El terminal SHALL mantener un ticket en curso que muestra todos los productos agregados con: cantidad x sabor, tamaño . tipo de boba, toppings, precio por línea, y botones de cantidad (+/-) y eliminar para cada item.

#### Scenario: Agregar producto al ticket

- **WHEN** el usuario confirma un producto
- **THEN** el producto aparece en el ticket en curso con cantidad 1 y su configuración completa

#### Scenario: Modificar cantidad

- **WHEN** el usuario toca los botones +/- en un item del ticket
- **THEN** la cantidad del item se incrementa o decrementa (mínimo 1) y el total se recalcula

#### Scenario: Eliminar producto

- **WHEN** el usuario toca "Quitar" en un item del ticket
- **THEN** el item se elimina del ticket y el total se recalcula

#### Scenario: Ticket vacío

- **WHEN** no hay productos en el ticket
- **THEN** el área de pago está deshabilitada y el botón de envío está inactivo

### Requirement: Nombre del cliente obligatorio

El terminal SHALL incluir un campo de texto obligatorio para el nombre o mesa del cliente en el momento del envío. El campo se convierte a mayúsculas automáticamente y, si está vacío habiendo ítems en el ticket, el envío se bloquea y el campo se resalta indicando el dato faltante.

#### Scenario: Envío sin nombre o mesa

- **WHEN** el usuario intenta enviar un pedido con al menos un ítem pero sin nombre o mesa
- **THEN** el sistema rechaza el envío, muestra "Falta el nombre o la mesa del cliente. Es un dato obligatorio." y resalta el campo

#### Scenario: Nombre escrito en mayúsculas

- **WHEN** el usuario escribe el nombre o mesa
- **THEN** el texto se muestra y se envía en mayúsculas, sin importar cómo se tecleó

#### Scenario: Cliente sin nombre

- **WHEN** el campo de nombre está vacío y el ticket no tiene ítems
- **THEN** el pedido no se puede enviar (no hay carrito que enviar)

### Requirement: Tipo de entrega MESA/LLEVAR obligatorio

El terminal SHALL mostrar un selector de tipo de entrega con dos opciones: MESA ("Para mesa") y LLEVAR ("Para llevar"). Para el cajero/admin el tipo de entrega es obligatorio antes de enviar; el selector se resalta y el envío se bloquea si falta.

#### Scenario: Cajero/Admin selecciona tipo de entrega

- **WHEN** el usuario tiene rol CAJERO o ADMIN y selecciona Para mesa o Para llevar
- **THEN** la opción elegida queda marcada y el pedido se envía con ese tipo de entrega

#### Scenario: Tipo de entrega omitido por el cajero

- **WHEN** el usuario con rol CAJERO o ADMIN intenta enviar sin haber elegido tipo de entrega
- **THEN** el sistema rechaza el envío, muestra "Falta elegir Para mesa o Para llevar. Es un dato obligatorio." y resalta el selector

#### Scenario: Mesero tiene tipo forzado

- **WHEN** el usuario tiene rol MESERO
- **THEN** el tipo de entrega queda forzado a MESA y el selector está deshabilitado

### Requirement: Botón de envío diferenciado por rol

El terminal SHALL mostrar un botón de envío cuyo texto y comportamiento dependen del rol del usuario, habilitado únicamente cuando el ticket tiene ítems y los datos obligatorios están completos. El total del ticket SHALL mostrarse únicamente dentro del botón de envío, sin una fila separada de "Total" en el ticket en curso.

#### Scenario: Cajero/Admin envía pedido

- **WHEN** el usuario tiene rol CAJERO o ADMIN con el ticket completo y toca el botón
- **THEN** el botón muestra "ACEPTAR" junto al total, el pedido se crea y el usuario permanece en Nueva Venta viendo el mensaje "Pedido #… creado · Total …"

#### Scenario: Mesero envía pedido

- **WHEN** el usuario tiene rol MESERO y toca el botón de envío
- **THEN** el botón muestra "Enviar a caja", el pedido se envía a la cola y el usuario permanece en el terminal POS para tomar otro pedido

#### Scenario: Total dentro del botón sin fila redundante

- **WHEN** el usuario arma un pedido con ítems y revisa el ticket en curso
- **THEN** el total aparece dentro del botón de envío ("ACEPTAR {total}" o "COMPLETAR PEDIDO" sin ítems) y el ticket no muestra una fila separada de "Total"

### Requirement: Persistencia del carrito

El terminal SHALL persistir el estado del carrito en localStorage para sobrevivir recargas de página, pero SHALL limpiar el carrito al montar el componente para evitar estados heredados de sesiones anteriores. La persistencia SHALL incluir los ítems, el nombre del cliente, el tipo de entrega y las indicaciones especiales.

#### Scenario: Recarga de página

- **WHEN** el usuario recarga la página teniendo productos en el carrito
- **THEN** los productos, el nombre, el tipo de entrega y las notas persistidos se restauran desde localStorage

#### Scenario: Nuevo inicio de sesión

- **WHEN** el usuario monta el componente del terminal (inicio de sesión nuevo)
- **THEN** el carrito se limpia independientemente del contenido en localStorage, incluidas las notas

### Requirement: Indicaciones especiales

El terminal SHALL incluir un campo opcional de indicaciones especiales en el ticket en curso, escrito en mayúsculas automáticamente. Las indicaciones SHALL persistirse en el pedido creado, imprimirse en la comanda y mostrarse en la tarjeta expandida de la cola.

#### Scenario: Indicación registrada

- **WHEN** el usuario escribe indicaciones y envía el pedido
- **THEN** el pedido guarda las indicaciones y estas se muestran en la comanda y en la tarjeta expandida de la cola

#### Scenario: Indicaciones opcionales

- **WHEN** el usuario deja el campo de indicaciones vacío
- **THEN** el pedido se crea sin guardar notas adicionales

#### Scenario: Cumpleaños y condiciones especiales

- **WHEN** el cliente menciona una condición especial (p. ej. cumpleaños, sin cebolla)
- **THEN** la indicación se registra en MAYÚSCULAS y queda visible para el personal de preparación

### Requirement: Feedback visual táctil

El terminal SHALL proporcionar feedback visual en interacciones táctiles: botones con efecto `active:scale-95` al tocar, resaltado de selección actual, y animación de glow para pedidos nuevos en la cola.

#### Scenario: Tocar botón de producto

- **WHEN** el usuario toca un botón de sabor, tamaño o boba
- **THEN** el botón muestra un efecto de escala reducida momentánea (feedback táctil)

#### Scenario: Producto seleccionado

- **WHEN** un producto está seleccionado
- **THEN** el botón muestra borde y fondo con color primario para indicar selección activa

### Requirement: Sección Carta en la terminal

El terminal SHALL mostrar una sección "Carta" además de la de Almuerzos, con una fila de pestañas por categoría de la carta (ej: SANDWICH, PIQUEO, MILANESA, POSTRE) y una cuadrícula de los platos disponibles de la categoría seleccionada. Cada plato SHALL mostrar su nombre, descripción y precio. Las categorías sin platos disponibles SHALL estar deshabilitadas.

#### Scenario: Tocar una categoría de la carta

- **WHEN** el usuario toca una pestaña de categoría de la carta
- **THEN** la categoría se resalta y la cuadrícula muestra los platos de la carta de esa categoría

#### Scenario: Categoría sin platos

- **WHEN** una categoría de la carta no tiene platos disponibles
- **THEN** la pestaña de categoría está deshabilitada con opacidad reducida

#### Scenario: Plato de carta con variantes

- **WHEN** el usuario toca un plato de la carta que tiene variantes (ej: Milanesa Pollo/Res)
- **THEN** aparece un selector de variante mostrando cada opción con su precio, y el botón de confirmación requiere elegir una variante antes de agregar al ticket

#### Scenario: Platos de almuerzo vs. carta

- **WHEN** el usuario revisa la sección de Almuerzos
- **THEN** la sección de Almuerzos solo muestra los platos del Menú del Día vigente y la sección de Carta solo muestra los platos de la carta, sin mezclarse

### Requirement: Contador de unidades en la tarjeta de almuerzo

La grilla de almuerzos del día del terminal del cajero SHALL mostrar en la esquina superior derecha de cada tarjeta de plato las unidades que esa caja todavía puede agregar, es decir la cantidad disponible de la jornada menos las que ya tiene apartadas en su propio ticket, con el mismo lenguaje visual que los números de acceso directo del catálogo. El número SHALL bajar en uno cada vez que el cajero agrega una unidad a su ticket y SHALL subir en uno cada vez que la quita, sin que el cajero tenga que recargar la página. El sistema SHALL mostrar un guion cuando el plato aún no tiene cantidad, el número de unidades agregables en estado normal, el número en rojo cuando llegue al umbral de aviso, y el número real en gris cuando no quede ninguna, mostrando la diferencia cuando la venta haya superado lo disponible. El umbral de aviso SHALL ser de cinco unidades, y el sistema no SHALL ofrecer ninguna vía para cambiarlo desde el POS ni desde el admin.

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

### Requirement: Menú de cambio de tipo de entrega en la cola

La cola de pedidos del terminal SHALL mostrar el tipo de entrega de cada pedido mediante su icono (bike para Delivery, bolsa para Llevar, cubiertos para Mesa) en la tarjeta expandida, al lado del total. El icono SHALL reaccionar al pasar el mouse (fondo y escala) y al hacer clic SHALL desplegar un menú con las otras dos modalidades de entrega para cambiar el pedido en cola sin perder su estado; SHALL cerrarse al hacer clic fuera y SHALL deshabilitarse en pedidos finalizados.

#### Scenario: Cambiar tipo de entrega desde la cola

- **WHEN** el usuario pasa el mouse sobre el icono de entrega de un pedido activo y hace clic
- **THEN** se despliega un menú con las otras dos modalidades (excluyendo la vigente) y el usuario puede cambiar el tipo de entrega del pedido

#### Scenario: Icono reacciona al hover

- **WHEN** el usuario posa el cursor sobre el icono de entrega
- **THEN** el icono reacciona visualmente (fondo gris y aumento de escala) indicando que es interactivo

#### Scenario: Cerrar el menú al hacer clic fuera

- **WHEN** el menú de tipo de entrega está abierto y el usuario hace clic fuera de él
- **THEN** el menú se cierra sin modificar el pedido

#### Scenario: Menú deshabilitado en pedidos finalizados

- **WHEN** el pedido está entregado o anulado
- **THEN** el icono de tipo de entrega se muestra deshabilitado (sin permitir abrir el menú ni cambiar el tipo)