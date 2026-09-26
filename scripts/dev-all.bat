@echo off
rem Levanta los cuatro servidores de una vez, cada uno en su ventana minima:
rem   store  3000   http://localhost:3000
rem   admin  3001   http://localhost:3001
rem   cajero 3002   http://localhost:3002
rem   mesero 3003   http://localhost:3003
rem Logs: %TEMP%\bbspos-<servidor>.log

call "%~dp0_dev-launch.bat" store  @bbspos/store  3000 http://localhost:3000
call "%~dp0_dev-launch.bat" admin  @bbspos/admin  3001 http://localhost:3001
call "%~dp0_dev-launch.bat" cajero @bbspos/cajero 3002 http://localhost:3002
call "%~dp0_dev-launch.bat" mesero @bbspos/mesero 3003 http://localhost:3003

echo.
echo [dev-all] Los cuatro servidores estan levantandose. Tarda ~10s en compilar el primero.
echo [dev-all] Para detener uno: cerrá su ventana, o volvé a correr el .bat de ese servidor.
pause
