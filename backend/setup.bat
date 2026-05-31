@echo off
title Viáticos App - Configuración inicial
echo.
echo ================================================
echo   VIATICOS APP - Configuracion inicial
echo ================================================
echo.

cd /d "%~dp0"

:: Verificar Python 3.13
py -3.13 --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python 3.13 no encontrado.
    echo Descarga Python 3.13 desde https://python.org
    pause
    exit /b 1
)

:: Crear entorno virtual si no existe
if not exist "venv" (
    echo [1/3] Creando entorno virtual con Python 3.13...
    py -3.13 -m venv venv
    if errorlevel 1 (
        echo [ERROR] No se pudo crear el entorno virtual.
        pause
        exit /b 1
    )
    echo       OK
) else (
    echo [1/3] Entorno virtual ya existe. OK
)

:: Instalar dependencias
echo [2/3] Instalando dependencias...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo [ERROR] Fallo la instalacion de dependencias.
    pause
    exit /b 1
)
echo       OK

echo [3/3] Configuracion completa.
echo.
echo ================================================
echo   Ahora ejecuta run.bat para iniciar el servidor
echo ================================================
echo.
pause
