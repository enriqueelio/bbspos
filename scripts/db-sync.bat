@echo off
setlocal enabledelayedexpansion

rem Uso: db-sync.bat [generate|migrate] [nombre-migracion]
rem   generate (default): regenera el cliente Prisma
rem   migrate <nombre>:   crea y aplica una migracion
rem Detiene los dev servers (puertos 3000/3001), ejecuta Prisma y los reinicia.

set "MODE=%~1"
if "%MODE%"=="" set "MODE=generate"
set "MIGNAME=%~2"
set "ROOT=%~dp0.."

echo [db-sync] Deteniendo dev servers (puertos 3000/3001)...
for /f "tokens=5" %%P in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING"') do taskkill /PID %%P /F >nul 2>&1
for /f "tokens=5" %%P in ('netstat -aon ^| findstr ":3001 " ^| findstr "LISTENING"') do taskkill /PID %%P /F >nul 2>&1
rem espera ~2s sin depender de stdin (timeout falla con entrada redirigida)
ping -n 3 127.0.0.1 >nul

pushd "%ROOT%"

if /i "%MODE%"=="migrate" (
    if "%MIGNAME%"=="" (
        echo [db-sync] Ejecutando migracion pendiente...
        call pnpm db:migrate
        if errorlevel 1 goto :fail
    ) else (
        echo [db-sync] Creando migracion "%MIGNAME%"...
        call pnpm --filter @bubba/db exec prisma migrate dev --name "%MIGNAME%"
        if errorlevel 1 goto :fail
    )
) else (
    echo [db-sync] Regenerando cliente Prisma...
    call pnpm db:generate
    if errorlevel 1 goto :fail
)

popd

echo [db-sync] Listo. Reiniciando dev servers...
start "bubba-dev" /min cmd /c "cd /d "%ROOT%" && pnpm dev > "%TEMP%\bubba-dev.log" 2> "%TEMP%\bubba-dev.err.log""
echo [db-sync] Logs: %TEMP%\bubba-dev.log
exit /b 0

:fail
popd
echo [db-sync] ERROR: el comando fallo. Dev servers NO reiniciados.
exit /b 1
