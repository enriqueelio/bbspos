## MODIFIED Requirements

### Requirement: Entrega del Menú del Día a las terminales

El sistema SHALL entregar a las terminales de mesero y cajero —y al catálogo público de la tienda— únicamente los platos disponibles con la bandera de Menú del Día vigente para la jornada actual, cada uno con su precio fijo y con el estado de cantidad de la jornada: cuántas unidades se programaron para el día, cuántas se vendieron, cuántas hay apartadas en tickets en curso y cuántas quedan disponibles. La cantidad disponible SHALL descontar los apartados de las otras cajas y no los de la caja que consulta, de modo que las demás cajas vean esas unidades descontadas. Junto con ese valor, el sistema SHALL entregar a la caja que consulta cuántas de esas unidades tiene ella misma apartadas en su ticket, para que la terminal pueda mostrarle lo que todavía puede agregar. Cuando nadie ha programado una cantidad para ese plato en la jornada, el sistema SHALL entregarlo sin cantidad controlada. La cantidad SHALL corresponder a la jornada en que el plato se produce, de modo que un pedido reservado para otra fecha consuma la cantidad de esa otra fecha.

#### Scenario: La terminal muestra los platos del día

- **WHEN** el personal de mesero o cajero abre la sección de Almuerzos en la terminal
- **THEN** la sección muestra los platos disponibles con Menú del Día vigente para la jornada, su precio fijo y su cantidad disponible

#### Scenario: Plato disponible pero no del día

- **WHEN** un plato está disponible pero no tiene la bandera de Menú del Día vigente
- **THEN** el plato no aparece en la sección de Almuerzos de las terminales

#### Scenario: Sin platos del día

- **WHEN** no hay platos con Menú del Día vigente
- **THEN** la sección de Almuerzos no muestra platos en las terminales (se muestra vacía o se oculta)

#### Scenario: Plato del día sin cantidad

- **WHEN** un plato del Menú del Día no tiene cantidad asignada para la jornada actual
- **THEN** el sistema lo entrega a la terminal sin cantidad controlada, sus ventas no consumen ninguna cantidad de la jornada y la terminal del cajero no lo ofrece a la venta hasta que se le asigne una
