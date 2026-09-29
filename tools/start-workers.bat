@echo off
rem Arranca en segundo plano los workers de BBSPOS (Telegram + reporte diario
rem + menu del dia). Se registra como tarea de inicio de sesion (BBSPOS Workers).
rem Los logs quedan en %TEMP%\opencode\worker-*.log(.err)
setlocal
set "DB=%~dp0..\packages\db"
set "LOGDIR=%TEMP%\opencode"
if not exist "%LOGDIR%" mkdir "%LOGDIR%" >nul 2>&1

rem pnpm puede venir del PATH o solo via corepack
set "PNPM=pnpm"
where pnpm >nul 2>&1 || set "PNPM=corepack pnpm"

cd /d "%DB%"
start "bbspos-telegram-alert" /b cmd /c "%PNPM% exec tsx scripts/telegram-alert-worker.ts > %LOGDIR%\worker-telegram-alert.log 2> %LOGDIR%\worker-telegram-alert.log.err"
start "bbspos-daily-report" /b cmd /c "%PNPM% exec tsx scripts/daily-report-worker.ts > %LOGDIR%\worker-daily-report.log 2> %LOGDIR%\worker-daily-report.log.err"
start "bbspos-menu-day" /b cmd /c "%PNPM% exec tsx scripts/menu-day-cleanup-worker.ts > %LOGDIR%\worker-menu-day-cleanup.log 2> %LOGDIR%\worker-menu-day-cleanup.log.err"

echo [workers] 3 workers lanzados desde %DB%
echo [workers] Logs: %LOGDIR%\worker-*.log
exit /b 0
