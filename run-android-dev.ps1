# run-android-dev.ps1 -- starts the Expo development build on the connected Android device
# Usage: .\run-android-dev.ps1  or  buildandroidDev.bat

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

Write-Host ""
Write-Host "================================================"
Write-Host "  Caregiver App -- Android Dev Build"
Write-Host "================================================"
Write-Host ""

# --- Apply Foojay fix (gets reset by npm install) ----------------------------
#
# node_modules/@react-native/gradle-plugin/settings.gradle.kts ships with a
# foojay toolchain auto-download plugin that conflicts with our local JDK setup.
# npm install restores the original file, so we re-comment the line every run.

$FoojayFile = "$ProjectRoot\node_modules\@react-native\gradle-plugin\settings.gradle.kts"

Write-Host "  Checking Foojay plugin fix ..."

if (-not (Test-Path $FoojayFile)) {
    Write-Host ""
    Write-Host "  ERROR: $FoojayFile not found." -ForegroundColor Red
    Write-Host "  Run 'npm install' first, then re-run this script." -ForegroundColor Red
    Write-Host ""
    Read-Host "  Press Enter to close"
    exit 1
}

$FoojayContent = Get-Content $FoojayFile -Raw
if ($FoojayContent -match '(?m)^plugins \{ id\("org\.gradle\.toolchains\.foojay') {
    $FixedLines = Get-Content $FoojayFile | ForEach-Object {
        if ($_ -match '^plugins \{ id\("org\.gradle\.toolchains\.foojay') {
            "// Foojay auto-download disabled -- JDK 17 and 21 provided via org.gradle.java.installations.paths"
            "// $_"
        } else {
            $_
        }
    }
    [System.IO.File]::WriteAllLines($FoojayFile, $FixedLines)
    Write-Host "  Foojay fix applied." -ForegroundColor Green
} else {
    Write-Host "  Foojay already disabled -- no fix needed." -ForegroundColor Gray
}

# --- Set environment variables -----------------------------------------------

$env:ANDROID_SERIAL = "R58M53P4QDM"
$env:JAVA_HOME      = "C:\Users\ofere\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
$env:ANDROID_HOME   = "C:\Users\ofere\AppData\Local\Android\Sdk"

Write-Host ""
Write-Host "  JAVA_HOME      : $env:JAVA_HOME"
Write-Host "  ANDROID_HOME   : $env:ANDROID_HOME"
Write-Host "  ANDROID_SERIAL : $env:ANDROID_SERIAL"
Write-Host ""

# --- Run dev build -----------------------------------------------------------

Write-Host "  Starting Expo dev build ..."
Write-Host "  (This compiles the native app and installs it on the device.)"
Write-Host "  (Subsequent runs are faster -- Metro bundler handles JS changes.)"
Write-Host ""

npx expo run:android
