# Monta a DATABASE_URL do .env.local sem que a senha apareça na tela,
# no histórico do terminal ou em qualquer log.
#
# Uso:  .\scripts\configurar-banco.ps1
#
# A senha é digitada oculta, codificada para uso em URL (@ vira %40, e assim
# por diante) e gravada direto no arquivo.

$ErrorActionPreference = 'Stop'

$raiz = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $raiz '.env.local'

if (-not (Test-Path $envFile)) {
  Write-Host "Nao encontrei $envFile" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "=== Configurar conexao com o banco ===" -ForegroundColor Cyan
Write-Host "Deixe em branco para manter o valor sugerido entre colchetes." -ForegroundColor DarkGray
Write-Host ""

function Pergunta($rotulo, $padrao) {
  $r = Read-Host "$rotulo [$padrao]"
  if ([string]::IsNullOrWhiteSpace($r)) { return $padrao }
  return $r.Trim()
}

$servidor = Pergunta 'Servidor' 'tracovolume.mysql.dbaas.com.br'
$porta    = Pergunta 'Porta' '3306'
$usuario  = Pergunta 'Usuario' 'tracovolume'
$banco    = Pergunta 'Nome do banco' 'tracovolume'

Write-Host ""
Write-Host "Senha (nao aparece enquanto voce digita):" -ForegroundColor Yellow
$segura = Read-Host -AsSecureString
$senha = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($segura)
)

if ([string]::IsNullOrWhiteSpace($senha)) {
  Write-Host "Senha vazia. Nada foi alterado." -ForegroundColor Red
  exit 1
}

# Codifica para a URL: @ vira %40, / vira %2F, etc.
$usuarioEnc = [System.Uri]::EscapeDataString($usuario)
$senhaEnc   = [System.Uri]::EscapeDataString($senha)
$url = "mysql://${usuarioEnc}:${senhaEnc}@${servidor}:${porta}/${banco}"

$linhas = Get-Content $envFile
$achou = $false
$saida = $linhas | ForEach-Object {
  if ($_ -match '^DATABASE_URL=') { $achou = $true; "DATABASE_URL=$url" } else { $_ }
}
if (-not $achou) { $saida += "DATABASE_URL=$url" }

Set-Content -Path $envFile -Value $saida -Encoding UTF8

Write-Host ""
Write-Host "DATABASE_URL gravada ($($senha.Length) caracteres de senha, codificada)." -ForegroundColor Green
Write-Host "Testando a conexao..." -ForegroundColor Cyan
Write-Host ""

Push-Location $raiz
try { node scripts/testar-banco.js } finally { Pop-Location }
