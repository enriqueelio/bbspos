## MODIFIED Requirements

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