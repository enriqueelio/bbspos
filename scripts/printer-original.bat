@echo off
rem Restaura la configuracion ORIGINAL del driver POS-80 (para usarlo con otro
rem sistema que no controla corte ni gavetero):
rem   - abre el gavetero antes de imprimir.
rem   - corta despues de cada pagina.
rem Requiere una consola como administrador.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0printer-pos80.ps1" -Profile original
pause
