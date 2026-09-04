# Grava as credenciais de e-mail no .env.local sem a senha aparecer na tela,
# no histórico do terminal ou em qualquer log.
#
# Uso:  .\scripts\configurar-email.ps1

$ErrorActionPreference = 'Stop'

$raiz = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $raiz '.env.local'

if (-not (Test-Path $envFile)) {
  Write-Host "Nao encontrei $envFile" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "=== Configurar envio de e-mail ===" -ForegroundColor Cyan
Write-Host "Enter aceita o valor entre colchetes." -ForegroundColor DarkGray
Write-Host ""

function Pergunta($rotulo, $padrao) {
  $r = Read-Host "$rotulo [$padrao]"
  if ([string]::IsNullOrWhiteSpace($r)) { return $padrao }
  return $r.Trim()
}

$host_    = Pergunta 'Servidor SMTP' 'email-ssl.com.br'
$porta    = Pergunta 'Porta' '587'
$usuario  = Pergunta 'Usuario (a caixa de e-mail)' 'loja@tracoevolume.com.br'
$remetente = Pergunta 'Nome que aparece como remetente' 'Traco e Volume'

Write-Host ""
Write-Host "Senha da caixa (nao aparece enquanto voce digita):" -ForegroundColor Yellow
$segura = Read-Host -AsSecureString
$senha = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($segura)
)

if ([string]::IsNullOrWhiteSpace($senha)) {
  Write-Host "Senha vazia. Nada foi alterado." -ForegroundColor Red
  exit 1
}

$novos = [ordered]@{
  'SMTP_HOST'     = $host_
  'SMTP_PORT'     = $porta
  'SMTP_USER'     = $usuario
  'SMTP_PASS'     = $senha
  'SMTP_FROM'     = "$remetente <$usuario>"
}

$linhas = @(Get-Content $envFile)
foreach ($chave in $novos.Keys) {
  $valor = $novos[$chave]
  $achou = $false
  for ($i = 0; $i -lt $linhas.Count; $i++) {
    if ($linhas[$i] -match "^$chave=") { $linhas[$i] = "$chave=$valor"; $achou = $true; break }
  }
  if (-not $achou) { $linhas += "$chave=$valor" }
}

Set-Content -Path $envFile -Value $linhas -Encoding UTF8

Write-Host ""
Write-Host "Credenciais gravadas ($($senha.Length) caracteres de senha)." -ForegroundColor Green
Write-Host "Testando o envio..." -ForegroundColor Cyan
Write-Host ""

Push-Location $raiz
try { node scripts/testar-email.js } finally { Pop-Location }
