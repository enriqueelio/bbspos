# Design: add-server-printer-config

## Context

La comanda actual se imprime en el navegador del cliente (`printReceipt` en cart/page.tsx). El servidor corre sobre Windows, lo que permite listar e imprimir sin dependencias nuevas usando PowerShell. Existe un patrón de configuración persistida en JSON (slideshow.json) y otro en base de datos (PaymentConfig).

## Goals / Non-Goals

**Goals**

- Elegir y probar la impresora desde admin; comanda automática al confirmar pedido; reimpresión manual.
- Que un fallo de impresión jamás impida vender.

**Non-Goals**

- Impresión ESC/POS cruda por red (puerto 9100) o Bluetooth: solo impresoras instaladas en Windows del servidor.
- Cola de impresión propia con reintentos: se apoya en la cola de Windows; reintento = botón Reimprimir.
- Múltiples impresoras por tipo (comanda/cocina): una sola destino.

## Decisions

### D1. Listado e impresión vía PowerShell (cero dependencias)

Listar: `Get-Printer | Select-Object Name, Default` parseado como CSV (`ConvertTo-Csv`), invocado con `child_process.execFile("powershell", [...])`. Imprimir: escribir el ticket a archivo temporal .txt y ejecutar `Out-Printer -Name <impresora>` — funciona con térmicas instaladas como "Generic / Text Only" y con cualquier impresora Windows. *Alternativas descartadas*: librerías npm de impresión (pesas, mantienen binarios), RAW 9100 (requiere red abierta y no lista impresoras).

### D2. Configuración en JSON junto a slideshow.json

`printer.json` en `store/public/../` (mismo directorio de configuración que slideshow.json: `apps/store/.printer.json` fuera de public para no exponerlo... decisión final: `apps/store/printing.json` con `{ printerName }`). Motivo: mismo patrón ya probado, sin migración ni schema change. La API la lee/escribe con fs.

### D3. Estado de impresión en memoria del propio flujo

El checkout llama server-side a la función de impresión tras crear el pedido (await con timeout ~10 s); resultado: IMPRESA / SIN_IMPRESORA / ERROR. Se devuelve al cliente solo para log discreto; el badge de reimpresión se resuelve consultando si `paidAt/paidAt==null && status RECIBIDO`... simplificación: el listado del admin muestra botón "Reimprimir" siempre; no se persiste estado de impresión por pedido (evita migración). El aviso post-falla queda cubierto por el botón permanente.

### D4. Comanda en texto plano monoespaciado

Mismo contenido que la comanda del navegador: encabezado BUBBA + #pedido, cliente, fecha/hora, ítems (cant × sabor/tamaño/boba + toppings indentados), total. Ancho objetivo 32-42 columnas, truncado de líneas largas.

### D5. Reimpresión compartida entre admin y cajero

La lógica de impresión vive en una librería del admin (`lib/printing.ts`) consumida por server actions de ambas apps; el cajero añade un botón "Reimprimir" compacto en cada tarjeta de su cola (Por cobrar / Por entregar) que invoca su propia action con confirmación visual inline del resultado. Ambas apps quedan sujetas a la misma validación de impresora configurada.

## Risks / Trade-offs

- [Out-Printer depende del driver] → En térmicas mal configuradas puede salir con fuente grande; mitigación: página de prueba para validar antes de operar.
- [execFile bloquea el request ~1-3 s] → Timeout de 10 s y best-effort; el checkout ya es transacción única.
- [Nombre de impresora con espacios/caracteres raros] → execFile sin shell evita inyección; nombre pasa como argumento citado por Node.

## Migration Plan

Sin migración de datos. Deploy directo; hasta que el admin elija impresora, los pedidos se crean sin imprimir (estado tolerante).

## Open Questions

- Ninguna pendiente que afecte specs o tareas.
