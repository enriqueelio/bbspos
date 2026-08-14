## Purpose

Establece la estructura base del monorepo del proyecto: paquetes compartidos y tareas orquestadas desde la raíz para que las aplicaciones de clientes y admin se construyan y ejecuten de forma consistente.

## ADDED Requirements

### Requirement: Monorepo con workspaces

El sistema SHALL organizar el proyecto como un monorepo con workspaces: una carpeta de aplicaciones (`apps`) y una carpeta de paquetes compartidos (`packages`), donde cada app y cada paquete sea un workspace instalable y referenciable por los demás.

#### Scenario: Referencia entre workspaces

- **WHEN** una app importa un paquete compartido del monorepo
- **THEN** el paquete se resuelve sin necesidad de publicarlo en un registro externo

#### Scenario: Instalación desde la raíz

- **WHEN** se ejecuta la instalación de dependencias desde la raíz del repositorio
- **THEN** se instalan las dependencias de todos los workspaces en un solo paso

### Requirement: Orquestación de tareas desde la raíz

El sistema SHALL definir tareas de desarrollo, construcción, lint y verificación de tipos ejecutables desde la raíz y aplicables a los workspaces correspondientes, con ejecución en paralelo cuando no haya dependencias entre ellos.

#### Scenario: Tareas en paralelo

- **WHEN** se ejecuta una tarea de verificación desde la raíz
- **THEN** la tarea se ejecuta sobre los workspaces que la declaran, en paralelo cuando es seguro

#### Scenario: Dependencia entre tareas

- **WHEN** un workspace necesita el resultado de la construcción de otro workspace
- **THEN** la tarea dependiente espera a que la dependencia termine antes de ejecutarse

### Requirement: Aplicaciones Next.js

El sistema SHALL proveer dos aplicaciones web sobre el mismo framework (Next.js con App Router y TypeScript): una para clientes (`store`) y otra para el panel admin (`admin`).

#### Scenario: Desarrollo de ambas apps

- **WHEN** se inicia el servidor de desarrollo desde la raíz
- **THEN** ambas aplicaciones quedan disponibles para desarrollo simultáneamente

### Requirement: Paquetes compartidos

El sistema SHALL proveer paquetes compartidos para componentes de interfaz, acceso a datos, tipos de dominio y configuración de tooling, reutilizables por ambas aplicaciones.

#### Scenario: Reutilización de componentes

- **WHEN** una app usa un componente del paquete de interfaz
- **THEN** el componente se renderiza con el mismo estilo y comportamiento en ambas apps

#### Scenario: Tipos de dominio compartidos

- **WHEN** una app importa un tipo de dominio del paquete de tipos
- **THEN** el tipo refleja el mismo contrato de datos en toda la base de código
