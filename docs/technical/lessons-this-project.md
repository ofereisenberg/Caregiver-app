# Lessons Learned — Caregiver App

> Project-specific discoveries: gotchas, non-obvious fixes, and "I wish I knew this before" moments.
> Append at the end of any session where something surprising was found. Never delete entries.
> Last updated: 2026-06-28

---

## Android / Gradle Build

### Debug APK requires Metro — it is not standalone
The APK produced by `npx expo run:android` (at `android/app/build/outputs/apk/debug/`) loads its JavaScript from the Metro bundler running on your dev machine. Installing it on a second device without Metro running shows a blank screen or connection error. To share with family members, build the release APK via `build-release.ps1` instead — that bundles JS into the APK.

### Gradle has two JS bundle cache locations — delete both
When forcing a re-bundle (e.g. after an env var change), deleting only `android/app/build/generated/assets/react/release/index.android.bundle` is not enough. Gradle also caches at `android/app/build/intermediates/assets/release/mergeReleaseAssets/index.android.bundle`. The build script deletes all `*.bundle` files recursively to catch both.

### `clean assembleRelease` fails — use delete-bundles + assembleRelease instead
`.\gradlew clean assembleRelease` fails because the `externalNativeBuildCleanDebug` task errors out when cleaning C++ native build artifacts. The correct approach for forcing a fresh JS bundle is to delete the bundle files directly and run `assembleRelease` without `clean`.

### Node.js heap OOM during large builds
When `expo export:embed` (called by Gradle during `assembleRelease`) runs out of memory, you see:
```
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
```
Set `$env:NODE_OPTIONS = "--max-old-space-size=8192"` before running the build.

### `externalNativeBuildCleanDebug` fails on Gradle clean
The C++ native clean task errors with `ninja: error: rebuilding 'build.ninja': subcommand failed`. Avoid `gradle clean` — it is not needed for routine releases.

---

## Environment Variables (Expo / Babel)

### `process.env[dynamicKey]` is NOT substituted at bundle time
Expo's Babel transform replaces `process.env.EXPO_PUBLIC_KEY` (static literal access) at bundle time with the actual value. It cannot substitute dynamic access like `process.env[key]` or `process.env['KEY']` — those evaluate to `undefined` in the bundled app.

**Wrong:**
```ts
function requireEnv(key: string) { return process.env[key]; }
requireEnv('EXPO_PUBLIC_SUPABASE_URL');
```

**Correct:**
```ts
function requireEnv(value: string | undefined, key: string) {
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}
requireEnv(process.env.EXPO_PUBLIC_SUPABASE_URL, 'EXPO_PUBLIC_SUPABASE_URL');
```

### Setting env vars in PowerShell does not help the Gradle build
`[System.Environment]::SetEnvironmentVariable(...)` set in one PowerShell tool call does NOT carry into a subsequent tool call — each is a separate process. Env var issues in the Gradle release build should be fixed in source code (static access pattern above), not by loading vars in the shell.

---

## PowerShell on Windows

### `Set-Content -Encoding UTF8` adds a BOM — this breaks Groovy/Gradle
PowerShell 5.1's `-Encoding UTF8` writes a UTF-8 BOM (`EF BB BF`) at the start of the file. Gradle's Groovy parser fails to compile `build.gradle` if it starts with a BOM:
```
Could not compile build file 'android/app/build.gradle' — startup failed: 1 error
```
Always use the .NET method for files that other tools will parse:
```powershell
[System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))
```

### Non-ASCII characters in `.ps1` files cause parser errors
Em-dashes (`—`), box-drawing characters (`──`), and other non-ASCII in PowerShell script files cause `ParserError: MissingEndCurlyBrace` and similar errors in PowerShell 5.1 when the file is UTF-8 without BOM. Use plain ASCII equivalents (`-`, `--`) in all `.ps1` files.

### Each Claude Code PowerShell tool call is a separate process
Variables, env vars, and working directory set in one tool call do not survive into the next. Always chain env setup + build command in a single tool call.

---

## Dependencies & Modules

### `expo-av` crashes with `LazyKType` on SDK 56
`expo-av 16.0.8` references `LazyKType` at runtime, but this class does not exist in `expo-modules-core 56.0.17`. The app crashes immediately on launch. Removed until voice input is built — at that point use `npx expo install expo-av` to get a compatible version.

### Foojay plugin must be re-commented after every `npm install`
`@react-native/gradle-plugin` bundles Foojay 0.5.0 which references `JvmVendorSpec.IBM_SEMERU` — removed in Gradle 9. The line must be commented out in `node_modules/@react-native/gradle-plugin/settings.gradle.kts` after every install. This is a `node_modules` file so it is not committed.

### New Architecture must stay disabled
`newArchEnabled=true` causes runtime crashes with some Expo modules in this project. Keep `newArchEnabled=false` in `android/gradle.properties`.

---

## Supabase / Auth

### Magic link OTP is 8 digits
The Supabase magic link sends an 8-digit OTP (not 6). The auth flow expects 8 characters.

---

## Sideloading APKs

### "Install from unknown sources" is per source app on Android
The permission is not a global toggle — Android asks which app is allowed to install APKs. Choose the app you'll use to open the APK (e.g. Google Drive, WhatsApp).
