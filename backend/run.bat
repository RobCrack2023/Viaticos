@echo off
title Viáticos App - Servidor
echo.
echo ================================================
echo   VIATICOS APP - Iniciando servidor...
echo ================================================
echo.

cd /d "%~dp0"

:: Verificar que el entorno virtual existe
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Entorno virtual no encontrado.
    echo Ejecuta primero: setup.bat
    echo.
    pause
    exit /b 1
)

:: Activar entorno virtual
call venv\Scripts\activate.bat

:: Iniciar servidor
echo   Servidor: http://localhost:8000
echo   API docs: http://localhost:8000/docs
echo   Admin:    admin@viaticos.cl / admin1234
echo.
echo   Presiona Ctrl+C para detener el servidor.
echo ================================================
echo.

python run.py
