@echo off
setlocal

rem Abre opencode en el proyecto con permisos de administrador.
rem Ejecuta: scripts\opencode-admin.bat   (o doble clic)

rem net session solo responde como administrador: es la comprobacion
rem clasica de elevacion sin tocar el sistema.
net session >nul 2>&1
if %errorlevel% EQU 0 goto :admin

echo Solicitando permisos de administrador...
powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs -WorkingDirectory '%~dp0..'"
exit /b

:admin
cd /d "%~dp0.."
where opencode >nul 2>&1
if %errorlevel% NEQ 0 (
    echo No se encontro opencode en el PATH. Reinspalalo o anade %APPDATA%\npm al PATH.
    pause
    exit /b 1
)
call opencode
exit /b %errorlevel%