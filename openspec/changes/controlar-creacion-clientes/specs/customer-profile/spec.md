# Spec Delta

## Purpose

Define el perfil del cliente con apodo (nickname): un nombre corto opcional que se autogenera desde el primer nombre, editable en Administración, y que identifica al cliente en pedidos y comandas sin necesidad de mostrar el nombre completo.

## ADDED Requirements

### Requirement: Apodo autogenerado del cliente

El sistema SHALL mantener un campo `nickname` (apodo) en el perfil del cliente. Al crear un cliente sin indicar apodo, el sistema SHALL copiar automáticamente el primer nombre del campo `name` como apodo. El apodo se envía en MAYÚSCULAS igual que el nombre.

#### Scenario: Crear cliente sin apodo

- **WHEN** el sistema crea un cliente con nombre "JUAN CARLOS PÉREZ" sin apodo
- **THEN** el cliente queda con apodo "JUAN" (primer nombre en mayúsculas)

#### Scenario: Client exists legacy

- **WHEN** el cliente fue creado antes de existir el campo apodo
- **THEN** el sistema trata su apodo como el primer nombre de `name`, sin datos duplicados

### Requirement: Apodo editable en Administración

El sistema SHALL permitir a un administrador ver y editar el apodo de un cliente existente desde la pantalla de clientes, de forma independiente del nombre completo. El apodo no reemplaza al nombre: el nombre completo sigue siendo el dato de identificación y el que se usa en reportes/ranking.

#### Scenario: Editar apodo

- **WHEN** un administrador edita el apodo de un cliente de "JUAN" a "JUANITO"
- **THEN** el cliente conserva su nombre completo y su apodo pasa a ser "JUANITO"

#### Scenario: Apodo vacío al editar

- **WHEN** un administrador guarda el cliente con el apodo vacío
- **THEN** el sistema vuelve a copiar el primer nombre del nombre completo como apodo