# Deployment and Rollback Checklist

This playbook is focused on safe deployment for Hosting + Realtime Database with rollback readiness.

## 1) Pre-deploy Safety Gate

Run these checks before every deploy:

1. `npm run check`
2. `powershell -NoProfile -ExecutionPolicy Bypass -File .vscode/scripts/prepush-check.ps1`
3. Verify no unresolved local conflicts:
   - `git status --short`

One-click option in VS Code task runner:

1. `Predeploy + Rollback Check`
2. This task runs quality gates, exports rollback snapshots, validates snapshot integrity, and creates a rollback probe patch file.
3. If snapshot export fails, run `firebase login` first, then rerun the task.

Hard stop conditions:

- Any failed step above.
- Missing required Firebase env variables in production build.
- Unreviewed database patch files under workspace root.

## 2) Create Rollback Snapshots (Mandatory)

Create timestamp first:

1. PowerShell: `$ts = Get-Date -Format 'yyyyMMdd-HHmmss'`

Export live data before rules/data changes:

1. `firebase database:get /groups --project hello-dalat-manager > groups-live-$ts.json`
2. `firebase database:get /bookings --project hello-dalat-manager > bookings-live-$ts.json`

Validate snapshots are non-empty:

1. `Get-Item groups-live-$ts.json, bookings-live-$ts.json | Select-Object Name, Length`

If either file is suspiciously small, stop and re-run export.

## 3) Dry-run Data Repair / Patch Generation

For missing-fields restore script:

1. `node scripts/generate-missing-fields-restore.mjs <sourceBookings> <targetBookings> <sourceGroups> <targetGroups> <outBookingsPatch> <outGroupsPatch> --dry-run`
2. Review printed stats (`bookingsPatchEntries`, `groupsPatchEntries`) for sanity.

For group repair script flow:

1. Fetch snapshots (`Fetch Groups Snapshot`, `Fetch Bookings Snapshot` tasks)
2. Generate patch (`Generate Group Repairs` task)
3. Count entries (`Count Group Repairs` task)
4. Manual review of patch JSON before apply

Hard stop conditions:

- Unexpectedly large patch counts.
- Patch touches unrelated fields.
- Script output contains parsing/input validation errors.

## 4) Deploy Order (Low Risk Sequence)

Always deploy in this order:

1. Deploy database rules only
   - Task: `Deploy OTA DB Rules`
2. Re-run smoke checks on auth/role-sensitive actions
3. Deploy hosting
   - Task: `Deploy Hosting via FirebaseCmd` (or `Deploy Hosting Live`)

Avoid `firebase deploy` full-stack unless explicitly required.

## 5) Production Smoke Test (10-15 minutes)

Validate these critical flows immediately after deploy:

1. Login for owner/admin/staff and confirm role-based access behavior
2. Create booking and edit payment fields
3. Create/update/delete expense
4. Add/remove service and discount
5. Confirm audit logs are generated for sensitive changes
6. Open report view and verify totals render without errors

## 6) Rollback Procedure

### 6.1 Rules rollback

If issue is permission-related after rules deploy:

1. Restore previous `database.rules.json` from git
2. Deploy rules again:
   - `firebase deploy --only database --project hello-dalat-manager`

### 6.2 Data rollback

If data corruption or wrong patch applied:

1. Build rollback patch from snapshots:
   - Use `groups-live-<timestamp>.json` and `bookings-live-<timestamp>.json`
2. Apply targeted restore first (smallest affected path)
   - Example: `firebase database:update /groups <rollback-groups-patch>.json --project hello-dalat-manager`
   - Example: `firebase database:update /bookings <rollback-bookings-patch>.json --project hello-dalat-manager`
3. Re-run smoke tests.

Rollback principle:

- Prefer path-scoped restore (`/groups`, `/bookings`) over full-database overwrite.
- Keep original bad patch and rollback patch for audit trace.

## 7) Post-deploy Monitoring (First 24h)

Track:

1. Console/runtime errors in client
2. Unexpected permission denied failures
3. Booking/payment mismatch reports
4. Patch scripts run history and generated files

If two or more critical incidents occur in 24h, trigger rollback review immediately.

## 8) Operational Notes

- Keep snapshot files with timestamps; do not overwrite.
- Use `--force` only when intentionally replacing patch outputs.
- Prefer dedicated tasks in `.vscode/tasks.json` to reduce command mistakes.
- Commit deployment-related script/rules changes separately from UI changes for easier rollback.
