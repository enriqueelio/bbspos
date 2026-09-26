@echo off
rem Levanta el admin (puerto 3001) en una ventana minima.
rem Logs: %TEMP%\bbspos-admin.log
call "%~dp0_dev-launch.bat" admin @bbspos/admin 3001 http://localhost:3001
pause
