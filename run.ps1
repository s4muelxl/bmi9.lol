Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

try {
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force | Out-Null
} catch {
  # Ignore if not permitted; activation may still work depending on policy.
}

$root = $PSScriptRoot
if (-not $root) {
  $root = (Get-Location).Path
}
Set-Location $root

if (Get-Command node -ErrorAction SilentlyContinue) {
  Write-Host "============================================" -ForegroundColor Cyan
  Write-Host "  BMI9 - Servidor Node.js iniciando..." -ForegroundColor Cyan
  Write-Host "  Acesse: http://localhost:5000" -ForegroundColor Cyan
  Write-Host "============================================" -ForegroundColor Cyan
  node server.js
  exit 0
}

$pyCmd = $null
if (Get-Command py -ErrorAction SilentlyContinue) {
  $pyCmd = "py"
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
  $pyCmd = "python"
}

if (-not $pyCmd) {
  Write-Host "[ERRO] Nem Node.js nem Python foram encontrados para iniciar o servidor local."
  Write-Host "Instale o Node.js (https://nodejs.org) ou Python (https://www.python.org/downloads/)."
  exit 1
}

if (-not (Test-Path ".\requirements.txt")) {
  Write-Host "[ERRO] requirements.txt nao encontrado."
  exit 1
}

if (-not (Test-Path ".\.venv")) {
  Write-Host "[INFO] Criando ambiente virtual..."
  & $pyCmd -m venv .venv
}

Write-Host "[INFO] Ativando ambiente virtual..."
& .\.venv\Scripts\Activate.ps1

Write-Host "[INFO] Instalando dependencias..."
python -m pip install --upgrade pip
pip install -r requirements.txt

Write-Host "[INFO] Iniciando servidor..."
$env:BMI9_DEBUG_ERRORS = "1"
$env:BMI9_ALLOW_ALL_CORS = "1"

python api/index.py
