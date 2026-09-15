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

$pyCmd = $null
if (Get-Command py -ErrorAction SilentlyContinue) {
  $pyCmd = "py"
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
  $pyCmd = "python"
}

if (-not $pyCmd) {
  Write-Host "[ERRO] Python nao encontrado. Instale o Python 3.10+ e tente novamente."
  Write-Host "Download: https://www.python.org/downloads/"
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
