@echo off
rem Levanta el cajero (puerto 3002) en una ventana minima.
rem Logs: %TEMP%\bbspos-cajero.log
call "%~dp0_dev-launch.bat" cajero @bbspos/cajero 3002 http://localhost:3002
pause
