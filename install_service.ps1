#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Instala a API Flask BMI9 como Serviço do Windows usando NSSM.
.DESCRIPTION
    - Baixa o NSSM (v2.24) automaticamente se não existir
    - Cria o serviço "BMI9_API_Orcamentos" apontando para o Python do venv
    - Configura auto-restart, logging e variáveis de ambiente
    - Inicia o serviço após instalação
.NOTES
    Execute como Administrador: Right-click PowerShell > "Run as Administrator"
#>

$ErrorActionPreference = "Stop"

# ── Configurações ──────────────────────────────────────────────
$ServiceName    = "BMI9_API_Orcamentos"
$ProjectDir     = Split-Path -Parent $MyInvocation.MyCommand.Path
$VenvPython     = Join-Path $ProjectDir ".venv\Scripts\python.exe"
$AppScript      = "api\index.py"
$NssmDir        = Join-Path $ProjectDir "tools\nssm"
$NssmExe        = Join-Path $NssmDir "nssm.exe"
$LogDir         = Join-Path $ProjectDir "logs"
$NssmZipUrl     = "https://nssm.cc/release/nssm-2.24.zip"
$NssmZipFile    = Join-Path $env:TEMP "nssm-2.24.zip"

# ── Cores para output ─────────────────────────────────────────
function Write-Step  { param($msg) Write-Host "[*] $msg" -ForegroundColor Cyan }
function Write-OK    { param($msg) Write-Host "[✓] $msg" -ForegroundColor Green }
function Write-Err   { param($msg) Write-Host "[✗] $msg" -ForegroundColor Red }

# ── 1. Verificar runtime (Python venv ou Node.js) ─────────────
Write-Step "Verificando ambiente de execução..."
$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
$NodeExe = if ($NodeCmd) { $NodeCmd.Source } else { $null }
$ExecPath = $null

if (Test-Path $VenvPython) {
    $ExecPath = $VenvPython
    $AppScript = "api\index.py"
    Write-OK "Python do venv encontrado: $VenvPython"
    
    # ── 2. Garantir dependências do Python instaladas ───────────
    Write-Step "Verificando dependências do pip..."
    $reqFile = Join-Path $ProjectDir "requirements.txt"
    if (Test-Path $reqFile) {
        & $VenvPython -m pip install -r $reqFile -q 2>$null
        Write-OK "Dependências verificadas."
    }
} elseif ($NodeExe) {
    $ExecPath = $NodeExe
    $AppScript = "server.js"
    Write-OK "Node.js encontrado: $NodeExe (executará server.js)"
} else {
    Write-Err "Nem Python do venv nem Node.js foram encontrados."
    Write-Err "Instale o Node.js ou execute run.bat para configurar o ambiente."
    exit 1
}

# ── 3. Baixar NSSM se necessário ──────────────────────────────
if (-not (Test-Path $NssmExe)) {
    Write-Step "Baixando NSSM v2.24..."
    
    # Criar diretório tools
    if (-not (Test-Path $NssmDir)) {
        New-Item -ItemType Directory -Path $NssmDir -Force | Out-Null
    }

    # Download
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $NssmZipUrl -OutFile $NssmZipFile -UseBasicParsing
        Write-OK "Download concluído."
    }
    catch {
        Write-Err "Falha ao baixar NSSM: $_"
        Write-Host ""
        Write-Host "Baixe manualmente de https://nssm.cc/release/nssm-2.24.zip" -ForegroundColor Yellow
        Write-Host "Extraia nssm.exe (win64) para: $NssmDir" -ForegroundColor Yellow
        exit 1
    }

    # Extrair
    Write-Step "Extraindo NSSM..."
    $tempExtract = Join-Path $env:TEMP "nssm-extract"
    if (Test-Path $tempExtract) { Remove-Item $tempExtract -Recurse -Force }
    Expand-Archive -Path $NssmZipFile -DestinationPath $tempExtract -Force

    # Copiar o executável win64
    $nssmSource = Join-Path $tempExtract "nssm-2.24\win64\nssm.exe"
    if (-not (Test-Path $nssmSource)) {
        # Tentar encontrar em qualquer subpasta
        $nssmSource = Get-ChildItem -Path $tempExtract -Filter "nssm.exe" -Recurse |
                      Where-Object { $_.DirectoryName -like "*win64*" } |
                      Select-Object -First 1 -ExpandProperty FullName
    }

    if ($nssmSource -and (Test-Path $nssmSource)) {
        Copy-Item $nssmSource -Destination $NssmExe -Force
        Write-OK "NSSM extraído para: $NssmExe"
    }
    else {
        Write-Err "Não foi possível encontrar nssm.exe no arquivo baixado."
        exit 1
    }

    # Limpar arquivos temporários
    Remove-Item $NssmZipFile -Force -ErrorAction SilentlyContinue
    Remove-Item $tempExtract -Recurse -Force -ErrorAction SilentlyContinue
}
else {
    Write-OK "NSSM já presente em: $NssmExe"
}

# ── 4. Verificar se o serviço já existe ───────────────────────
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Step "Serviço '$ServiceName' já existe. Removendo para reconfigurar..."
    if ($existingService.Status -eq "Running") {
        & $NssmExe stop $ServiceName 2>$null
        Start-Sleep -Seconds 2
    }
    & $NssmExe remove $ServiceName confirm 2>$null
    Start-Sleep -Seconds 1
    Write-OK "Serviço antigo removido."
}

# ── 5. Criar diretório de logs ────────────────────────────────
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# ── 6. Instalar o serviço ────────────────────────────────────
Write-Step "Instalando serviço '$ServiceName'..."

& $NssmExe install $ServiceName $ExecPath
if ($LASTEXITCODE -ne 0) {
    Write-Err "Falha ao instalar o serviço."
    exit 1
}

# Configurar parâmetros
& $NssmExe set $ServiceName AppDirectory       $ProjectDir
& $NssmExe set $ServiceName AppParameters      $AppScript
& $NssmExe set $ServiceName DisplayName        "BMI9 - API de Orçamentos"
& $NssmExe set $ServiceName Description        "API Flask para o sistema de orçamentos BMI9. Roda em http://127.0.0.1:5000"
& $NssmExe set $ServiceName Start              SERVICE_AUTO_START

# Configurar restart em caso de falha
& $NssmExe set $ServiceName AppExit            Default Restart
& $NssmExe set $ServiceName AppRestartDelay    5000

# Configurar logs (stdout e stderr)
$stdoutLog = Join-Path $LogDir "service_stdout.log"
$stderrLog = Join-Path $LogDir "service_stderr.log"
& $NssmExe set $ServiceName AppStdout          $stdoutLog
& $NssmExe set $ServiceName AppStderr          $stderrLog
& $NssmExe set $ServiceName AppStdoutCreationDisposition 4
& $NssmExe set $ServiceName AppStderrCreationDisposition 4
& $NssmExe set $ServiceName AppRotateFiles     1
& $NssmExe set $ServiceName AppRotateBytes     1048576

# Variáveis de ambiente
& $NssmExe set $ServiceName AppEnvironmentExtra "BMI9_DEBUG_ERRORS=1" "BMI9_ALLOW_ALL_CORS=1"

Write-OK "Serviço instalado com sucesso!"

# ── 7. Iniciar o serviço ─────────────────────────────────────
Write-Step "Iniciando serviço..."
& $NssmExe start $ServiceName

Start-Sleep -Seconds 3
$svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($svc -and $svc.Status -eq "Running") {
    Write-OK "Serviço rodando com sucesso!"
}
else {
    Write-Err "O serviço pode não ter iniciado corretamente. Verifique os logs em: $LogDir"
    Write-Host "  Use: Get-Service $ServiceName" -ForegroundColor Yellow
    Write-Host "  Logs: $stdoutLog" -ForegroundColor Yellow
}

# ── Resumo ────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  BMI9 - Serviço do Windows Configurado!" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Nome do Serviço : $ServiceName" -ForegroundColor White
Write-Host "  API URL         : http://127.0.0.1:5000" -ForegroundColor White
Write-Host "  Logs            : $LogDir" -ForegroundColor White
Write-Host ""
Write-Host "  Comandos úteis:" -ForegroundColor Yellow
Write-Host "    Get-Service $ServiceName         # Ver status" -ForegroundColor Gray
Write-Host "    Restart-Service $ServiceName      # Reiniciar" -ForegroundColor Gray
Write-Host "    Stop-Service $ServiceName         # Parar" -ForegroundColor Gray
Write-Host "    Start-Service $ServiceName        # Iniciar" -ForegroundColor Gray
Write-Host ""
