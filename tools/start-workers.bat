@echo off
rem Arranca en segundo plano los workers de BBSPOS (Telegram + cierre + menu del dia).
rem Se registra como tarea de inicio de sesion (BBSPOS Workers).
rem Los logs quedan en %TEMP%\opencode\worker-*.log(.err)
cd /d "C:\Users\PC-ENRIQUE\Documents\bbspos\packages\db"
start "bbspos-telegram-alert" /b cmd /c "npx tsx scripts/telegram-alert-worker.ts > %TEMP%\opencode\worker-telegram-alert.log 2> %TEMP%\opencode\worker-telegram-alert.log.err"
start "bbspos-daily-report" /b cmd /c "npx tsx scripts/daily-report-worker.ts > %TEMP%\opencode\worker-daily-report.log 2> %TEMP%\opencode\worker-daily-report.log.err"
start "bbspos-menu-day" /b cmd /c "npx tsx scripts/menu-day-cleanup-worker.ts > %TEMP%\opencode\worker-menu-day-cleanup.log 2> %TEMP%\opencode\worker-menu-day-cleanup.log.err"