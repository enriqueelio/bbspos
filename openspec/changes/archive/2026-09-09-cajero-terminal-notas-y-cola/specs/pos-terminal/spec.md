## MODIFIED Requirements

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

El terminal SHALL mostrar un botón de envío cuyo texto y comportamiento dependen del rol del usuario, habilitado únicamente cuando el ticket tiene ítems y los datos obligatorios están completos.

#### Scenario: Cajero/Admin envía pedido

- **WHEN** el usuario tiene rol CAJERO o ADMIN con el ticket completo y toca el botón
- **THEN** el botón muestra "ACEPTAR" junto al total, el pedido se crea y el usuario permanece en Nueva Venta viendo el mensaje "Pedido #… creado · Total …"

#### Scenario: Mesero envía pedido

- **WHEN** el usuario tiene rol MESERO y toca el botón de envío
- **THEN** el botón muestra "Enviar a caja", el pedido se envía a la cola y el usuario permanece en el terminal POS para tomar otro pedido

### Requirement: Persistencia del carrito

El terminal SHALL persistir el estado del carrito en localStorage para sobrevivir recargas de página, pero SHALL limpiar el carrito al montar el componente para evitar estados heredados de sesiones anteriores. La persistencia SHALL incluir los ítems, el nombre del cliente, el tipo de entrega y las indicaciones especiales.

#### Scenario: Recarga de página

- **WHEN** el usuario recarga la página teniendo productos en el carrito
- **THEN** los productos, el nombre, el tipo de entrega y las notas persistidos se restauran desde localStorage

#### Scenario: Nuevo inicio de sesión

- **WHEN** el usuario monta el componente del terminal (inicio de sesión nuevo)
- **THEN** el carrito se limpia independientemente del contenido en localStorage, incluidas las notas

## ADDED Requirements

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