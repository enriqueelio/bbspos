@echo off
rem Levanta el mesero (puerto 3003) en una ventana minima.
rem Logs: %TEMP%\bbspos-mesero.log
call "%~dp0_dev-launch.bat" mesero @bbspos/mesero 3003 http://localhost:3003
pause
