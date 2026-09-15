@echo off
setlocal
cd /d %~dp0

if not exist .venv (
  echo [INFO] Criando ambiente virtual...
  py -m venv .venv 2>nul || python -m venv .venv
  if errorlevel 1 (
    echo [ERRO] Falha ao criar o ambiente virtual. Instale o Python 3.10+.
    echo Abra: https://www.python.org/downloads/
    pause
    exit /b 1
  )
)

set "VENV_PY=%~dp0.venv\Scripts\python.exe"

if not exist "%VENV_PY%" (
  echo [ERRO] Python do venv nao encontrado em: %VENV_PY%
  pause
  exit /b 1
)

echo [INFO] Instalando dependencias...
"%VENV_PY%" -m pip install --upgrade pip -q
"%VENV_PY%" -m pip install -r requirements.txt -q

set BMI9_DEBUG_ERRORS=1
set BMI9_ALLOW_ALL_CORS=1

echo.
echo ============================================
echo   BMI9 - Servidor Flask iniciando...
echo   Acesse: http://127.0.0.1:5000
echo ============================================
echo.

"%VENV_PY%" api\index.py

echo.
echo [INFO] Servidor encerrado.
pause
