# Spec Delta

## ADDED Requirements

### Requirement: Límite de tamaño en módulos cliente

Todo archivo de componente cliente en `apps/` SHALL medir menos de 400 líneas y toda función o componente SHALL medir menos de 200 líneas. Estos límites SHALL estar verificados automáticamente por ESLint, inicialmente como advertencia y luego como error. Un módulo SHALL superar el límite solo mediante desactivación explícita de la regla en esa línea, acompañada de un comentario que explique el motivo.

#### Scenario: Archivo dentro del límite

- **WHEN** se añade un componente cliente nuevo de 150 líneas
- **THEN** el lint pasa sin avisos sobre tamaño

#### Scenario: Archivo que excede el límite

- **WHEN** se añade un componente cliente de 500 líneas
- **THEN** el lint reporta un `max-lines` señalando el archivo y el fix queda pendiente, sin impedir el commit mientras la regla esté en modo advertencia

#### Scenario: Excepción justificada

- **WHEN** un módulo supera 400 líneas por una razón concreta (por ejemplo, un archivo de configuración de rutas generado)
- **THEN** la regla se desactiva en esa línea con un comentario que explica por qué, y no se borra la regla del proyecto

### Requirement: Un módulo por dominio, con su estado local

Cada pestaña visible de un gestor SHALL corresponderse con un módulo propio, y ese módulo SHALL declarar el estado de su propio dominio. Un panel SHALL NOT leer ni escribir el estado de otro panel; si dos paneles necesitan el mismo dato, este SHALL recibirse por props en lugar de compartirse como estado. El componente raíz del gestor SHALL conservar únicamente el estado de navegación (la pestaña activa) y los datos recibidos.

#### Scenario: Estado aislado por pestaña

- **WHEN** el usuario llena el formulario de Alta de sabores sin guardar y cambia a la pestaña "Salsas Alitas"
- **THEN** el formulario de sabores conserva lo escrito y el formulario de salsas no se inicializa a partir de él

#### Scenario: Root como shell

- **WHEN** se inspecciona el componente raíz del gestor de menú
- **THEN** su único estado propio es la pestaña activa, y su longitud está por debajo de 150 líneas

#### Scenario: Datos compartidos por props

- **WHEN** dos paneles requieren el catálogo de tamaños
- **THEN** ambos lo reciben como prop desde la carga de la página, sin duplicar el estado ni leerlo del panel vecino

### Requirement: Lógica de presentación extraída del componente

Los cálculos de presentación —cálculo de minutos transcurridos, ventana de reserva, rangos de fechas de reporte, formateo— SHALL vivir en funciones que no dependan de React y SHALL estar separadas del componente que las usa. Los hooks SHALL limitarse a coordinar el efecto con React (temporizadores, suscripciones) y SHALL delegar el cálculo a esas funciones.

#### Scenario: Cálculo de espera testeable sin React

- **WHEN** se quiere verificar el cálculo de minutos de espera de un pedido
- **THEN** se puede invocar la función de cálculo directamente con un pedido y un instante, sin montar componente ni esperar temporizadores

#### Scenario: El hook no calcula

- **WHEN** se lee el código del hook de reloj de la cola
- **THEN** las funciones de temporizadores se limitan a agendar el re-render y el resultado del cálculo se obtiene de una función pura importada

### Requirement: Red de seguridad mínima antes del refactor

El repositorio SHALL contar con un runner de tests y tests unitarios sobre la lógica de UI extraída a módulos, antes de dar por cerrado el refactor de los módulos cliente grandes. Los tests SHALL cubrir la lógica extraída en la fase de extracción, no componentes completos.

#### Scenario: Tests sobre lógica extraída

- **WHEN** se ejecuta el comando de tests del workspace
- **THEN** se ejecutan los casos de los helpers de reloj de cola y de rangos de reporte, y pasan en verde

#### Scenario: Refactor sin red de tests

- **WHEN** se propone cerrar el refactor de un archivo cliente grande
- **THEN** el criterio de aceptación incluye tests verdes para la lógica que ese archivo exponía

### Requirement: Comportamiento observable preservado

La descomposición de módulos cliente SHALL preservar el comportamiento observable de cada pantalla: mismas rutas, mismos textos, mismos campos, misma validación, mismos efectos sobre la base de datos y mismo resultado de impresión. Un cambio de estructura SHALL NOT requerir modificar capacidades de negocio (`pos-terminal`, `cashier`, `ordering`, `reports`, `drink-catalog`, `lunch-menu`). Si una de esas capacidades necesita un cambio de requisito, la descomposición se considera fuera de alcance.

#### Scenario: Flujo idéntico antes y después

- **WHEN** se recorre el flujo completo de venta, cobro y entrega en el cajero, antes y después de la descomposición
- **THEN** el resultado es el mismo en ambos casos, sin diferencias de textos, validaciones ni datos guardados

#### Scenario: Necesidad de cambiar una spec de negocio

- **WHEN** la descomposición de un archivo requiere modificar un requisito de `pos-terminal`, `cashier`, `ordering`, `reports`, `drink-catalog` o `lunch-menu`
- **THEN** el trabajo se detiene y se reevalúa, porque la descomposición no debe alterar conducta de negocio

#### Scenario: Commit por sub-pieza

- **WHEN** se revisa el historial de la descomposición de un archivo cliente grande
- **THEN** los commits corresponden a sub-piezas identificables y el diff de la fase es revisable por lectura, sin reescrituras de lógica mezcladas con el movimiento

### Requirement: Verificación manual por fase

Cada fase de la descomposición SHALL cerrarse con verificación manual en pantalla de los flujos que el archivo afectado controla, usando `docs/VERIFICACION-MANUAL-CAJAERO-ADMIN.md` como línea base. `typecheck` y `lint` en verde SHALL NOT considerarse verificación suficiente, porque no detectan un componente que deja de renderizar.

#### Scenario: Línea base antes de empezar

- **WHEN** arranca la descomposición
- **THEN** el checklist completo ya fue recorrido y existe evidencia de cómo se ven las pantallas hoy

#### Scenario: Lint verde no basta

- **WHEN** una fase deja el lint y el typecheck en verde pero nadie abrió la pantalla afectada
- **THEN** la fase no está cerrada
