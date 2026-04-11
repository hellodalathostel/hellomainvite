[CmdletBinding()]
param(
  [switch]$SkipQualityGate,
  [switch]$SkipRollbackProbe
)

$ErrorActionPreference = 'Stop'

$projectId = 'hello-dalat-manager'
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$groupsSnapshot = "groups-live-$timestamp.json"
$bookingsSnapshot = "bookings-live-$timestamp.json"
$rollbackProbe = "groups-rollback-check-$timestamp.json"

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Title,
    [Parameter(Mandatory = $true)]
    [scriptblock]$Script
  )

  Write-Output "--- $Title ---"
  & $Script
}

if (-not $SkipQualityGate) {
  Invoke-Step -Title 'Pre-deploy quality gate' -Script {
    powershell -NoProfile -ExecutionPolicy Bypass -File .vscode/scripts/prepush-check.ps1
  }
}

$firebaseCmd = Join-Path $env:APPDATA 'npm\firebase.cmd'
if (-not (Test-Path $firebaseCmd)) {
  throw "firebase CLI not found at $firebaseCmd"
}

Invoke-Step -Title 'Verify Firebase auth context' -Script {
  & $firebaseCmd projects:list --json > $null
  if ($LASTEXITCODE -ne 0) {
    throw "Firebase auth check failed. Run 'firebase login' and ensure access to project $projectId."
  }
}

Invoke-Step -Title 'Export rollback snapshots' -Script {
  & $firebaseCmd database:get /groups --project $projectId | Set-Content $groupsSnapshot
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to export /groups snapshot. Check Firebase auth/project access."
  }

  & $firebaseCmd database:get /bookings --project $projectId | Set-Content $bookingsSnapshot
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to export /bookings snapshot. Check Firebase auth/project access."
  }
}

Invoke-Step -Title 'Validate snapshot files' -Script {
  $files = @($groupsSnapshot, $bookingsSnapshot)
  foreach ($file in $files) {
    if (-not (Test-Path $file)) {
      throw "Snapshot file missing: $file"
    }

    $size = (Get-Item $file).Length
    if ($size -lt 10) {
      throw "Snapshot file appears too small: $file ($size bytes)"
    }

    $raw = Get-Content $file -Raw
    $trimmed = $raw.Trim()
    if ($trimmed -notmatch '^(\{|\[|null)') {
      throw "Snapshot file is not JSON. First 200 chars: $($trimmed.Substring(0, [Math]::Min(200, $trimmed.Length)))"
    }

    try {
      $null = $trimmed | ConvertFrom-Json
    } catch {
      throw "Snapshot file JSON parse failed for $file. Details: $($_.Exception.Message)"
    }
  }
}

if (-not $SkipRollbackProbe) {
  Invoke-Step -Title 'Rollback patch probe (dry verification)' -Script {
    node scripts/repair-legacy-groups.mjs $groupsSnapshot $bookingsSnapshot $rollbackProbe
    if (-not (Test-Path $rollbackProbe)) {
      throw "Rollback probe file missing: $rollbackProbe"
    }

    $count = (Get-Content $rollbackProbe -Raw | ConvertFrom-Json | Get-Member -MemberType NoteProperty).Count
    Write-Output "Rollback probe entries: $count"
  }
}

Write-Output '--- Predeploy + rollback check complete ---'
Write-Output "Timestamp: $timestamp"
Write-Output "Snapshots: $groupsSnapshot, $bookingsSnapshot"
Write-Output "Rollback probe: $rollbackProbe"
