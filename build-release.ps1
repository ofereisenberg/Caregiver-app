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
Write-Host "  APK : $ApkDest"
Write-Host "  Tag : v$NewVersion"
Write-Host ""
Write-Host "  Next steps:"
Write-Host "    1. Upload the APK to Google Drive > Caregiver App > v$NewVersion"
Write-Host "    2. Share the file with family members to install"
Write-Host ""
Read-Host "  Press Enter to close"
