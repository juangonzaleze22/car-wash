@echo off
REM ========================================
REM Script para aplicar migraciones manuales
REM ========================================
REM 
REM Uso: apply-migration.bat <nombre-archivo-sql>
REM Ejemplo: apply-migration.bat time-tracking.sql
REM

if "%~1"=="" (
    echo ERROR: Debes especificar el archivo SQL
    echo Uso: apply-migration.bat ^<nombre-archivo-sql^>
    echo.
    echo Archivos disponibles en migrations-manual/:
    dir /b migrations-manual\*.sql
    pause
    exit /b 1
)

set SQL_FILE=%~1

echo ========================================
echo Aplicando migracion: %SQL_FILE%
echo ========================================
echo.

cd /d "%~dp0"

if not exist "migrations-manual\%SQL_FILE%" (
    echo ERROR: El archivo migrations-manual\%SQL_FILE% no existe
    pause
    exit /b 1
)

echo Ejecutando script SQL...
call npx prisma db execute --file migrations-manual\%SQL_FILE% --schema prisma/schema.prisma

if %errorlevel% neq 0 (
    echo ERROR: No se pudo ejecutar el script SQL
    pause
    exit /b 1
)

echo.
echo Generando cliente de Prisma...
call npx prisma generate

if %errorlevel% neq 0 (
    echo ERROR: No se pudo generar el cliente de Prisma
    pause
    exit /b 1
)

echo.
echo ========================================
echo MIGRACION COMPLETADA EXITOSAMENTE
echo Por favor reinicia el servidor backend
echo Ctrl+C y luego: npm run dev
echo ========================================
echo.
pause
