# build-release.ps1 -- builds a release APK for Android sideloading
# Usage: .\build-release.ps1  or  npm run build:android  or  buildandroid.bat

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

# --- Read current versions ---------------------------------------------------

$AppJsonContent = Get-Content "$ProjectRoot\app.json" -Raw
if ($AppJsonContent -match '"version":\s*"([^"]+)"') {
    $CurrentVersion = $matches[1]
} else {
    Write-Host "ERROR: Could not read version from app.json" -ForegroundColor Red
    exit 1
}

$BuildGradleContent = Get-Content "$ProjectRoot\android\app\build.gradle" -Raw
if ($BuildGradleContent -match 'versionCode\s+(\d+)') {
    $CurrentVersionCode = [int]$matches[1]
} else {
    Write-Host "ERROR: Could not read versionCode from build.gradle" -ForegroundColor Red
    exit 1
}

# --- Prompt for new version --------------------------------------------------

Write-Host ""
Write-Host "================================================"
Write-Host "  Caregiver App -- Android Release Builder"
Write-Host "================================================"
Write-Host ""
Write-Host "  Current version : $CurrentVersion  (versionCode $CurrentVersionCode)"
Write-Host ""
$NewVersion = Read-Host "  New version number [Enter to keep $CurrentVersion]"
if ([string]::IsNullOrWhiteSpace($NewVersion)) {
    $NewVersion = $CurrentVersion
}
$NewVersionCode = $CurrentVersionCode + 1

Write-Host ""

# --- Generate release notes via Claude Haiku ---------------------------------

$NotesText = $null

$ApiKey = $null
if (Test-Path "$ProjectRoot\.env") {
    Get-Content "$ProjectRoot\.env" | ForEach-Object {
        if ($_ -match '^ANTHROPIC_API_KEY=(.+)$') {
            $ApiKey = $matches[1].Trim().Trim('"').Trim("'")
        }
    }
}

if ($ApiKey) {
    Write-Host "  Generating release notes with Claude Haiku ..."

    $PrevTag = git -C $ProjectRoot describe --tags --abbrev=0 2>$null
    if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($PrevTag)) {
        $CommitLines = git -C $ProjectRoot log "$PrevTag..HEAD" --oneline --no-merges
    } else {
        $CommitLines = @(git -C $ProjectRoot log --oneline --no-merges | Select-Object -First 25)
    }
    $CommitText = $CommitLines -join "`n"

    $SystemPrompt = "You write concise app release notes for a family caregiver coordination app. " +
        "Output exactly two sections, separated by the headers === ENGLISH === and === DEUTSCH ===. " +
        "Rules: (1) Each new feature gets a bold title of max 5 words on one line, followed by a single description line of max 10 words. " +
        "(2) All bug fixes are grouped under a single bold 'Bug Fixes' / 'Fehlerbehebungen' heading as a bullet list, max 10 words per bullet. " +
        "(3) Skip meta commits: session notes, lessons-learned docs, build tooling changes, next_session updates. " +
        "(4) No emojis. No markdown except bold titles (**Title**). " +
        "(5) The Deutsch section must be a faithful translation of the English section."

    $RequestBody = @{
        model    = "claude-haiku-4-5-20251001"
        max_tokens = 600
        system   = $SystemPrompt
        messages = @(@{ role = "user"; content = "Generate release notes for v$NewVersion from these git commits:`n`n$CommitText" })
    } | ConvertTo-Json -Depth 5 -Compress

    try {
        $ApiResponse = Invoke-RestMethod `
            -Uri "https://api.anthropic.com/v1/messages" `
            -Method POST `
            -Headers @{ "x-api-key" = $ApiKey; "anthropic-version" = "2023-06-01"; "content-type" = "application/json" } `
            -Body $RequestBody
        $NotesText = $ApiResponse.content[0].text
        Write-Host "  Done." -ForegroundColor Green
    } catch {
        Write-Host "  WARNING: API call failed ($($_.Exception.Message)) -- falling back to manual entry." -ForegroundColor Yellow
    }
} else {
    Write-Host "  WARNING: ANTHROPIC_API_KEY not found in .env -- using manual entry." -ForegroundColor Yellow
}

if ($NotesText) {
    # Review / edit loop
    $Accepted = $false
    while (-not $Accepted) {
        Write-Host ""
        Write-Host "  ------------------------------------------------" -ForegroundColor Cyan
        $NotesText -split "`n" | ForEach-Object { Write-Host "  $_" }
        Write-Host "  ------------------------------------------------" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  [Y] Accept   [E] Edit in Notepad   [R] Regenerate"
        $Choice = (Read-Host "  Choice").ToUpper().Trim()
        switch ($Choice) {
            'Y' { $Accepted = $true }
            'E' {
                $TempFile = Join-Path $env:TEMP "release-notes-v$NewVersion.txt"
                [System.IO.File]::WriteAllText($TempFile, $NotesText, [System.Text.UTF8Encoding]::new($false))
                Start-Process notepad.exe -ArgumentList $TempFile -Wait
                $NotesText = [System.IO.File]::ReadAllText($TempFile)
                $Accepted = $true
            }
            'R' {
                Write-Host "  Regenerating ..." -ForegroundColor Gray
                try {
                    $ApiResponse = Invoke-RestMethod `
                        -Uri "https://api.anthropic.com/v1/messages" `
                        -Method POST `
                        -Headers @{ "x-api-key" = $ApiKey; "anthropic-version" = "2023-06-01"; "content-type" = "application/json" } `
                        -Body $RequestBody
                    $NotesText = $ApiResponse.content[0].text
                } catch {
                    Write-Host "  WARNING: Regeneration failed." -ForegroundColor Yellow
                    $Accepted = $true
                }
            }
            default { Write-Host "  Please type Y, E, or R." -ForegroundColor Yellow }
        }
    }
} else {
    # Manual fallback
    Write-Host ""
    Write-Host "  -- Release notes (English) -- one line at a time, empty line to finish"
    $EnLines = @()
    while ($true) { $line = Read-Host "  EN"; if ([string]::IsNullOrEmpty($line)) { break }; $EnLines += $line }
    Write-Host ""
    Write-Host "  -- Release notes (Deutsch) -- Zeile fuer Zeile, leere Zeile zum Beenden"
    $DeLines = @()
    while ($true) { $line = Read-Host "  DE"; if ([string]::IsNullOrEmpty($line)) { break }; $DeLines += $line }
    $NotesText = "=== ENGLISH ===`n`n" + ($EnLines -join "`n") + "`n`n=== DEUTSCH ===`n`n" + ($DeLines -join "`n")
}

Write-Host ""
Write-Host "  Building v$NewVersion (versionCode $NewVersionCode) ..."
Write-Host ""

# --- Update version numbers in source files ----------------------------------

$AppJsonContent = $AppJsonContent -replace '"version":\s*"[^"]*"', "`"version`": `"$NewVersion`""
[System.IO.File]::WriteAllText("$ProjectRoot\app.json", $AppJsonContent, [System.Text.UTF8Encoding]::new($false))

$BuildGradleContent = $BuildGradleContent -replace 'versionCode\s+\d+', "versionCode $NewVersionCode"
$BuildGradleContent = $BuildGradleContent -replace 'versionName\s+"[^"]*"', "versionName `"$NewVersion`""
[System.IO.File]::WriteAllText("$ProjectRoot\android\app\build.gradle", $BuildGradleContent, [System.Text.UTF8Encoding]::new($false))

# --- Delete cached JS bundles so Gradle re-bundles from source ---------------

Get-ChildItem -Path "$ProjectRoot\android" -Recurse -Filter "*.bundle" -ErrorAction SilentlyContinue | Remove-Item -Force

# --- Build -------------------------------------------------------------------

$env:JAVA_HOME    = "C:\Users\ofere\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
$env:ANDROID_HOME = "C:\Users\ofere\AppData\Local\Android\Sdk"

$LogFile = "$ProjectRoot\gradle-build.log"
Set-Location "$ProjectRoot\android"
.\gradlew assembleRelease 2>&1 | Tee-Object -FilePath $LogFile
$BuildExitCode = $LASTEXITCODE
Set-Location $ProjectRoot

if ($BuildExitCode -ne 0) {
    Write-Host ""
    Write-Host "  BUILD FAILED - check $LogFile for details." -ForegroundColor Red
    Write-Host "  Version numbers have been updated but no APK was produced."
    Write-Host ""
    Read-Host "  Press Enter to close"
    exit 1
}

# --- Copy APK to releases folder ---------------------------------------------

$ReleasesDir = "$ProjectRoot\releases\v$NewVersion"
New-Item -ItemType Directory -Force -Path $ReleasesDir | Out-Null

$ApkSource = "$ProjectRoot\android\app\build\outputs\apk\release\app-release.apk"
$ApkDest   = "$ReleasesDir\caregiver-app-v$NewVersion.apk"
Copy-Item $ApkSource $ApkDest

$NotesDest = "$ReleasesDir\release-notes-v$NewVersion.txt"
$NotesContent = @("v$NewVersion -- Release Notes", ("=" * 40), "") + ($NotesText -split "`n")
[System.IO.File]::WriteAllLines($NotesDest, $NotesContent, [System.Text.UTF8Encoding]::new($false))

# --- Commit version bump and tag release -------------------------------------

Write-Host ""
Write-Host "  Committing version bump ..."

git -C $ProjectRoot add "$ProjectRoot\app.json"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  WARNING: git add failed -- commit and tag skipped." -ForegroundColor Yellow
} else {
    git -C $ProjectRoot commit -m "Release v$NewVersion"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  WARNING: git commit failed -- tag and push skipped." -ForegroundColor Yellow
    } else {
        git -C $ProjectRoot tag "v$NewVersion"
        git -C $ProjectRoot push origin HEAD
        git -C $ProjectRoot push origin "v$NewVersion"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Committed, tagged, and pushed v$NewVersion." -ForegroundColor Green
        } else {
            Write-Host "  WARNING: git push failed -- commit and tag exist locally but were not pushed." -ForegroundColor Yellow
        }
    }
}

# --- Done --------------------------------------------------------------------

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Build complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  APK   : $ApkDest"
Write-Host "  Notes : $NotesDest"
Write-Host "  Tag   : v$NewVersion"
Write-Host ""
Write-Host "  Next steps:"
Write-Host "    1. Upload the APK to Google Drive > Caregiver App > v$NewVersion"
Write-Host "    2. Share the file with family members to install"
Write-Host ""
Read-Host "  Press Enter to close"
