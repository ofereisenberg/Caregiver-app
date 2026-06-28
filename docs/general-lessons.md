# General Dev Lessons

> Patterns and pitfalls that apply to any future React Native / Expo / Windows project.
> Not project-specific. Append when something would save time on the next app.
> Last updated: 2026-06-28

---

## Expo / React Native

### EXPO_PUBLIC_* env vars require static property access in code
Expo's Babel transform substitutes `process.env.EXPO_PUBLIC_KEY` at bundle time. It cannot handle dynamic access:
- `process.env[key]` — NOT substituted (key is a variable)
- `process.env['KEY']` — substituted only in some setups; avoid
- `process.env.EXPO_PUBLIC_KEY` — always works

Validator helpers should receive the already-accessed value, not the key name:
```ts
// Pattern that works reliably
requireEnv(process.env.EXPO_PUBLIC_SUPABASE_URL, 'EXPO_PUBLIC_SUPABASE_URL')
```

### Debug builds are not standalone — they need Metro
Expo development builds (`npx expo run:android`) load JS from the Metro bundler on the dev machine. They are not suitable for distributing to end users or running offline. For sideloading or sharing, always use a release build with bundled JS.

### Release APK via local Gradle build (no EAS needed)
For small projects that don't need Play Store distribution, `./gradlew assembleRelease` produces a sideloadable APK. The default `build.gradle` already signs it with the debug keystore, which is sufficient for family/internal testing.

### Expo bare workflow: android/ and ios/ gitignore by default
Expo's default `.gitignore` excludes `/android` and `/ios` as generated artifacts. This is fine if you have no custom native code. If you apply manual fixes to native files (Gradle config, plugin workarounds), track those files in git or document the manual steps precisely.

### New Architecture can cause runtime crashes
React Native's New Architecture (TurboModules/Fabric) is not yet stable for all Expo modules. If you see unexplained runtime crashes after enabling it, disable it first: `newArchEnabled=false` in `android/gradle.properties`.

---

## Android Build / Gradle

### Gradle has multiple output cache locations for the JS bundle
When forcing a fresh JS bundle, deleting one output file is not enough. Gradle caches intermediate results in multiple directories. Delete all `*.bundle` files recursively under `android/` before rebuilding.

### Avoid `gradle clean` if you only need to re-bundle JS
`gradle clean` touches native C++ build artifacts that may fail to clean (especially on Windows with Ninja). Deleting only the JS bundle files and running `assembleRelease` is faster and more reliable.

### Node.js OOM during `expo export:embed`
Large React Native projects can exhaust Node.js's default heap (~4GB) during bundling. Add before build:
```powershell
$env:NODE_OPTIONS = "--max-old-space-size=8192"
```

---

## Windows Development Environment

### PowerShell 5.1: `Set-Content -Encoding UTF8` writes a BOM
Files written with `-Encoding UTF8` in PowerShell 5.1 start with a UTF-8 BOM (`EF BB BF`). This breaks any tool that doesn't expect a BOM: Gradle/Groovy, many text parsers, and some JSON parsers.

Always use the no-BOM .NET method when writing files that other tools will read:
```powershell
[System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))
```

### PowerShell 5.1: non-ASCII characters in `.ps1` files break the parser
Em-dashes, curly quotes, box-drawing characters, etc. in script files cause cryptic parse errors (`MissingEndCurlyBrace`, `MissingExpression`) when the file is saved as UTF-8 without BOM. Keep all `.ps1` files ASCII-only.

### Each shell tool call is an isolated process
Whether using Claude Code's PowerShell tool or npm scripts, environment variables set in one invocation do not carry to the next. Always chain setup + execution in a single command, or use a script file.

### JDK version management on Windows with Gradle
Gradle may need different JDK versions for different tasks (e.g. JDK 17 for Kotlin compilation, JDK 21 for some Expo modules). Register all required JDKs in `gradle.properties`:
```properties
org.gradle.java.installations.paths=C:/path/to/jdk17,C:/path/to/jdk21
org.gradle.java.installations.auto-download=false
```
Set `JAVA_HOME` to the primary version (17). `auto-download=false` prevents Gradle from downloading JDKs via Foojay.

---

## Sideloading & Distribution

### "Install from unknown sources" is per source app, not global
On Android, the permission to install APKs is granted per source application (e.g. Google Drive, WhatsApp). Users must enable it for whichever app they use to open the APK file.

### Version tracking for sideloaded APKs
Without a Play Store to manage versions, establish a simple convention from the start:
- `versionCode` (integer, always incrementing) — Android uses this to detect upgrades
- `versionName` (string, semantic) — shown to users in Settings > Apps
- Named APK files: `appname-v1.0.1.apk` in a versioned folder
- Store in Google Drive with folder per version

### ADB is the fastest way to diagnose crashes on sideloaded builds
Enable USB debugging, connect via USB, and run:
```powershell
adb -s <device_serial> logcat -b crash -d
```
The crash buffer contains the full stack trace including JavaScript errors.
