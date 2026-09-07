## Purpose

Terminal POS táctil de dos columnas para la toma de pedidos en la app del cajero — permite a meseros y cajeros seleccionar productos por categoría/sabor/tamaño/boba/toppings, gestionar un ticket en curso, y enviar pedidos con tipo de entrega MESA o LLEVAR.

## ADDED Requirements

### Requirement: Layout de dos columnas

El terminal POS SHALL mostrar un layout responsive de dos columnas: la columna izquierda contiene el selector de productos (categorías, sabores, tamaño, tipo de boba, toppings) y la columna derecha muestra el ticket en curso con los items agregados, nombre del cliente, tipo de entrega, total y botón de envío.

#### Scenario: Layout en pantalla grande

- **WHEN** el dispositivo tiene una pantalla con ancho mayor a 1024px
- **THEN** el terminal muestra ambas columnas lado a lado — izquierda para selector de productos, derecha para ticket en curso

#### Scenario: Layout en pantalla pequeña

- **WHEN** el dispositivo tiene una pantalla con ancho menor o igual a 1024px
- **THEN** el terminal muestra las columnas apiladas verticalmente — selector de productos arriba, ticket en curso abajo

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

### Requirement: Nombre del cliente

El terminal SHALL incluir un campo de texto opcional para ingresar el nombre del cliente, visible en el ticket en curso y en la comanda impresa.

#### Scenario: Cliente con nombre

- **WHEN** el usuario ingresa un nombre en el campo de cliente
- **THEN** el nombre se muestra en el ticket y se envía con el pedido

#### Scenario: Cliente sin nombre

- **WHEN** el campo de nombre está vacío
- **THEN** el pedido se envía sin nombre de cliente

### Requirement: Tipo de entrega MESA/LLEVAR

El terminal SHALL mostrar un selector de tipo de entrega con dos opciones: MESA y LLEVAR. El comportamiento del selector depende del rol del usuario.

#### Scenario: Cajero/Admin selecciona tipo de entrega

- **WHEN** el usuario tiene rol CAJERO o ADMIN
- **THEN** puede seleccionar libremente entre MESA y LLEVAR

#### Scenario: Mesero tiene tipo forzado

- **WHEN** el usuario tiene rol MESERO
- **THEN** el tipo de entrega está forzado a MESA y el selector está deshabilitado

### Requirement: Botón de envío diferenciado por rol

El terminal SHALL mostrar un botón de envío cuyo texto y comportamiento dependen del rol del usuario.

#### Scenario: Cajero/Admin envía pedido

- **WHEN** el usuario tiene rol CAJERO o ADMIN y toca el botón de envío
- **THEN** el botón muestra "Enviar y Cobrar" + total, el pedido se envía a la cola, y el usuario es redirigido a la pestaña de preparación

#### Scenario: Mesero envía pedido

- **WHEN** el usuario tiene rol MESERO y toca el botón de envío
- **THEN** el botón muestra "Enviar a Caja", el pedido se envía a la cola, y el usuario permanece en el terminal POS para tomar otro pedido

### Requirement: Persistencia del carrito

El terminal SHALL persistir el estado del carrito en localStorage para sobrevivir recargas de página, pero SHALL limpiar el carrito al montar el componente para evitar estados heredados de sesiones anteriores.

#### Scenario: Recarga de página

- **WHEN** el usuario recarga la página teniendo productos en el carrito
- **THEN** los productos persistidos se restauran desde localStorage

#### Scenario: Nuevo inicio de sesión

- **WHEN** el usuario monta el componente del terminal (inicio de sesión nuevo)
- **THEN** el carrito se limpia independientemente del contenido en localStorage

### Requirement: Feedback visual táctil

El terminal SHALL proporcionar feedback visual en interacciones táctiles: botones con efecto `active:scale-95` al tocar, resaltado de selección actual, y animación de glow para pedidos nuevos en la cola.

#### Scenario: Tocar botón de producto

- **WHEN** el usuario toca un botón de sabor, tamaño o boba
- **THEN** el botón muestra un efecto de escala reducida momentánea (feedback táctil)

#### Scenario: Producto seleccionado

- **WHEN** un producto está seleccionado
- **THEN** el botón muestra borde y fondo con color primario para indicar selección activa
