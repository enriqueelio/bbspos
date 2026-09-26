@echo off
setlocal enabledelayedexpansion

rem Uso: _dev-launch.bat <nombre> <filtro-pnpm> <puerto> <url>
rem   Libera el puerto, abre una ventana minima con el dev server y deja el log
rem   en %TEMP%\bbspos-<nombre>.log. Helper de dev-*.bat: no lo ejecutes solo.

set "NAME=%~1"
set "FILTER=%~2"
set "PORT=%~3"
set "URL=%~4"
set "ROOT=%~dp0.."
set "LOG=%TEMP%\bbspos-%~1.log"

if "%NAME%"=="" (
    echo [_dev-launch] ERROR: falta el nombre. Uso: _dev-launch.bat ^<nombre^> ^<filtro^> ^<puerto^> ^<url^>
    exit /b 1
)

echo [_dev-launch] Liberando el puerto %PORT%...
call :killport %PORT%
rem ~2s sin depender de stdin (timeout falla con entrada redirigida)
ping -n 3 127.0.0.1 >nul

start "%NAME% bbspos" /min cmd /c "cd /d ""%ROOT%"" && pnpm --filter %FILTER% dev > ""%LOG%"" 2>&1"
echo [_dev-launch] %NAME%: %URL%
echo [_dev-launch] Log: %LOG%
exit /b 0

:killport
for /f "tokens=5" %%P in ('netstat -aon ^| findstr ":%~1 " ^| findstr "LISTENING"') do taskkill /PID %%P /F >nul 2>&1
goto :eof
