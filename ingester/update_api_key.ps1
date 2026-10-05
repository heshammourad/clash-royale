# Rotates the Clash Royale API key used by the battle-log-ingester Cloud Run
# service. Pass the key with -Key, or omit it to be prompted (keeps the key out
# of your PowerShell history).
param([string]$Key)

$ErrorActionPreference = "Stop"

$Project = "clash-royale-479900"
$Region = "us-west1"
$Service = "battle-log-ingester"

if (-not $Key) {
  $secure = Read-Host -Prompt "New Clash Royale API key" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $Key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}
$Key = $Key.Trim()
if (-not $Key) {
  Write-Error "No key provided; aborting."
}

# --update-env-vars only touches API_TOKEN; PLAYER_TAG and DB_CONNECTION_STRING
# are left as-is. This deploys a new revision of the same image.
gcloud run services update $Service `
  --project=$Project `
  --region=$Region `
  --update-env-vars="API_TOKEN=$Key" `
  --quiet
if ($LASTEXITCODE -ne 0) {
  Write-Error "gcloud update failed (exit code $LASTEXITCODE)."
}

$revision = gcloud run services describe $Service `
  --project=$Project `
  --region=$Region `
  --format="value(status.latestReadyRevisionName)"
Write-Host "Updated API_TOKEN on $Service (now serving revision $revision)."
