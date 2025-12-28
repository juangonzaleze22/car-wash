@echo off
echo ========================================
echo CarWash Pro - Instalacion de Multer
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Instalando multer y tipos...
call npm install multer @types/multer

if %errorlevel% neq 0 (
    echo ERROR: No se pudo instalar multer
    pause
    exit /b 1
)

echo.
echo [2/3] Ejecutando migracion de base de datos...
call npx prisma migrate dev --name add_order_images

if %errorlevel% neq 0 (
    echo ERROR: No se pudo ejecutar la migracion
    pause
    exit /b 1
)

echo.
echo [3/3] Generando cliente de Prisma...
call npx prisma generate

if %errorlevel% neq 0 (
    echo ERROR: No se pudo generar el cliente de Prisma
    pause
    exit /b 1
)

echo.
echo ========================================
echo INSTALACION COMPLETADA EXITOSAMENTE
echo ========================================
echo.
echo Ahora puedes reiniciar el servidor backend con: npm run dev
echo.
pause
