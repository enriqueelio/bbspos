@echo off
rem Levanta el store (puerto 3000) en una ventana minima.
rem Logs: %TEMP%\bbspos-store.log
call "%~dp0_dev-launch.bat" store @bbspos/store 3000 http://localhost:3000
pause
