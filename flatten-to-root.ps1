# === Promote apps/frontend → repo root and delete legacy monorepo folders ===
# Run from the monorepo root that still has apps/frontend and packages/

$ErrorActionPreference = 'Stop'
$root = Get-Location

if (-not (Test-Path '.\apps\frontend')) {
  Write-Error "apps\frontend not found. Run this from the monorepo root."
}

Write-Host "Moving apps\frontend\* to root..."

# Move files and folders (including hidden) from apps/frontend up
Get-ChildItem -Path '.\apps\frontend' -Force | ForEach-Object {
  $dest = Join-Path $root $_.Name
  if (Test-Path $dest) {
    Remove-Item -Recurse -Force $dest
  }
  Move-Item -Force $_.FullName $dest
  Write-Host "  moved $($_.Name)"
}

# Remove empty / leftover monorepo dirs
@(
  '.\apps',
  '.\packages',
  '.\docker-compose.yml',
  '.\docker-compose.yaml'
) | ForEach-Object {
  if (Test-Path $_) {
    Remove-Item -Recurse -Force $_
    Write-Host "Removed $_"
  }
}

Write-Host "`nDone. Root is now a standalone Next.js app."
Write-Host "Next: copy .env.example to .env.local, set SUPABASE_SERVICE_ROLE_KEY, then npm install && npm run dev"
