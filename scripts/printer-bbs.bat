@echo off
rem Aplica a la impresora POS-80 la configuracion que usa bbspos:
rem   - el driver NO abre el gavetero ni corta solo (lo hace el codigo del POS).
rem   - margen de salida 3mm.
rem Requiere una consola como administrador.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0printer-pos80.ps1" -Profile bbs
pause
