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