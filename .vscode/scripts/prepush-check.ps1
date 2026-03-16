$ErrorActionPreference = 'Stop'

$pattern = '(AIza[0-9A-Za-z_-]{35}|VITE_[A-Z0-9_]+=|authorizing via signed-in user|@gmail\.com)'

Write-Output '--- Secret scan ---'
if (Get-Command rg -ErrorAction SilentlyContinue) {
  rg -n --hidden -g '!dist/**' -g '!node_modules/**' -g '!.git/**' $pattern .
} else {
  Write-Output 'rg not found; using Select-String fallback'
  Get-ChildItem -Recurse -File |
    Where-Object {
      $_.FullName -notmatch '\\dist\\|\\node_modules\\|\\.git\\' -and
      $_.Name -ne 'prepush-check.ps1'
    } |
    Select-String -Pattern $pattern -AllMatches |
    Select-Object -First 120 Path, LineNumber, Line
}

Write-Output '--- Dry run git add ---'
git add -n .

Write-Output '--- Git status with ignored ---'
git status --short --ignored
