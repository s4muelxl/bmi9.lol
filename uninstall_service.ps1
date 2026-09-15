#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Remove o serviço BMI9 API de Orçamentos do Windows.
.NOTES
    Execute como Administrador: Right-click PowerShell > "Run as Administrator"
#>

$ErrorActionPreference = "Stop"

$ServiceName = "BMI9_API_Orcamentos"
$ProjectDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$NssmExe     = Join-Path $ProjectDir "tools\nssm\nssm.exe"

function Write-Step  { param($msg) Write-Host "[*] $msg" -ForegroundColor Cyan }
function Write-OK    { param($msg) Write-Host "[✓] $msg" -ForegroundColor Green }
function Write-Err   { param($msg) Write-Host "[✗] $msg" -ForegroundColor Red }

# Verificar se o NSSM existe
if (-not (Test-Path $NssmExe)) {
    Write-Err "NSSM não encontrado em: $NssmExe"
    Write-Err "O serviço pode não ter sido instalado via este script."
    exit 1
}

# Verificar se o serviço existe
$svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $svc) {
    Write-Err "Serviço '$ServiceName' não encontrado."
    exit 0
}

# Parar o serviço se estiver rodando
if ($svc.Status -eq "Running") {
    Write-Step "Parando serviço '$ServiceName'..."
    & $NssmExe stop $ServiceName
    Start-Sleep -Seconds 3
    Write-OK "Serviço parado."
}

# Remover o serviço
Write-Step "Removendo serviço '$ServiceName'..."
& $NssmExe remove $ServiceName confirm

if ($LASTEXITCODE -eq 0) {
    Write-OK "Serviço '$ServiceName' removido com sucesso!"
}
else {
    Write-Err "Falha ao remover o serviço. Código de saída: $LASTEXITCODE"
    exit 1
}

Write-Host ""
Write-Host "O serviço foi completamente removido do Windows." -ForegroundColor Green
Write-Host "A pasta 'tools\nssm\' foi mantida. Remova-a manualmente se desejar." -ForegroundColor Gray
Write-Host ""
