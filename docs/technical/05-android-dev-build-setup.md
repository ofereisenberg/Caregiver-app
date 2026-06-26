# Android Development Build Setup Guide
**Purpose:** Step-by-step instructions for building and running the Expo development build on a physical Android device from Windows. Captures all hard-won fixes so setup is reproducible.
**Last updated:** 2026-06-26

---

## Prerequisites

- Android Studio installed (provides Android SDK + ADB)
- Node.js / npm installed
- Physical Android device with USB debugging enabled

---

## Windows-Specific Setup (one-time)

### Step 1 — Install both JDK 17 and JDK 21

Gradle needs JDK 17 as the primary compiler, but `expo-modules-core` requests JDK 21 for one compilation step. Both must be installed.

- **JDK 17 (Eclipse Temurin):** [adoptium.net](https://adoptium.net) — install to default path, e.g. `C:\Users\<user>\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.x.x-hotspot`
- **JDK 21:** Android Studio's bundled JBR already provides this at `C:\Program Files\Android\Android Studio\jbr`

### Step 2 — Register both JDKs in `android/gradle.properties`

```properties
org.gradle.java.installations.auto-download=false
org.gradle.java.installations.paths=C:/Users/<user>/AppData/Local/Programs/Eclipse Adoptium/jdk-17.0.19.10-hotspot,C:/Program Files/Android/Android Studio/jbr
kotlin.jvm.target.validation.mode=IGNORE
```

`kotlin.jvm.target.validation.mode=IGNORE` suppresses JVM target mismatch errors caused by third-party libraries that mix Kotlin JVM targets.

### Step 3 — Disable the Foojay toolchains plugin

The `@react-native/gradle-plugin` bundles Foojay version 0.5.0 which references `JvmVendorSpec.IBM_SEMERU` — a constant removed in Gradle 9. Comment it out after every `npm install`:

File: `node_modules/@react-native/gradle-plugin/settings.gradle.kts`

```kotlin
// Foojay auto-download disabled — JDK 17 and 21 provided via org.gradle.java.installations.paths
// plugins { id("org.gradle.toolchains.foojay-resolver-convention").version("0.8.0") }
```

> **Note:** This edit is in `node_modules` and will be lost after `npm install`. Re-apply it each time.

### Step 4 — Target device with ANDROID_SERIAL

Without `ANDROID_SERIAL` set, Expo picks the first available device — usually the emulator. Always set it explicitly before building for a physical device.

Run the build with:
```powershell
$env:ANDROID_SERIAL = "R58M53P4QDM"   # replace with your device serial
$env:JAVA_HOME = "C:\Users\ofere\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
$env:ANDROID_HOME = "C:\Users\ofere\AppData\Local\Android\Sdk"
npx expo run:android
```

Find your device serial with: `adb devices`

---

## New Architecture

Keep `newArchEnabled=false` in `android/gradle.properties`. The app targets Old Architecture (bridge mode) in development. New Architecture (TurboModules/Fabric) causes runtime crashes with some Expo modules in this project.

---

## Known Issues & Fixes

### `IBM_SEMERU` error during Gradle sync

**Cause:** Foojay plugin 0.5.0 references a constant removed in Gradle 9.3+.
**Fix:** Comment out the plugin in `node_modules/@react-native/gradle-plugin/settings.gradle.kts` (see Step 3 above).

### `Cannot find Java 17` (when JAVA_HOME points to JDK 21)

**Cause:** The Gradle settings plugin compileKotlin task requires JDK 17 specifically.
**Fix:** Set `JAVA_HOME` to the JDK 17 installation path, not JDK 21.

### `Cannot find Java 21`

**Cause:** `expo-modules-core` requests `jvmToolchain(21)`. If only JDK 17 is listed in `org.gradle.java.installations.paths`, Gradle can't find it.
**Fix:** Add the Android Studio JBR path (JDK 21) to `org.gradle.java.installations.paths`.

### `pattern matching in instanceof not supported in -source 8`

**Cause:** `react.internal.disableJavaVersionAlignment=true` was set, preventing the RN plugin from overriding `-source 8` to 17 for `@react-native-community/datetimepicker`.
**Fix:** Remove `react.internal.disableJavaVersionAlignment=true` from `gradle.properties`.

### `INSTALL_FAILED_NO_MATCHING_ABIS`

**Cause:** APK was built for x86_64 (emulator) but the phone is arm64.
**Fix:** Set `ANDROID_SERIAL` to the phone's serial before running `npx expo run:android`. Expo reads the connected device's ABI and builds accordingly.

### `LazyKType` runtime crash (expo-av)

```
java.lang.NoClassDefFoundError: Failed resolution of: Lexpo/modules/kotlin/types/LazyKType
at expo.modules.av.video.VideoViewModule.definition
```

**Cause:** `expo-av 16.0.8`'s `VideoViewModule` references `LazyKType` at runtime, but this class does not exist in `expo-modules-core 56.0.17`. The class is missing from the compiled APK entirely — it is a version incompatibility, not a build cache issue.

**Fix applied (2026-06-26):** Removed `expo-av` from the project because it was not yet used. The voice input feature (which requires expo-av for audio recording) had not been built yet.

**When adding voice input (Step 11 in CLAUDE.md):**
- Re-install expo-av: `npm install expo-av`
- Re-apply the Foojay plugin comment (Step 3 above)
- Verify the LazyKType crash does not recur. If it does, check for a newer version of expo-modules-core or expo-av that resolves the incompatibility: `npx expo install expo-av` (lets Expo pick a compatible version)
- If it still crashes, the workaround is to exclude `VideoViewModule` from the module registry, keeping only the audio modules

---

## After `npm install`

Re-apply the Foojay plugin comment (Step 3). It will be overwritten every time `node_modules` is regenerated.

---

## Infrastructure reference

| Item | Value |
|---|---|
| Phone ADB serial | `R58M53P4QDM` |
| JDK 17 path | `C:\Users\ofere\AppData\Local\Programs\Eclipse Adoptium\jdk-17.0.19.10-hotspot` |
| JDK 21 path | `C:\Program Files\Android\Android Studio\jbr` |
| Android SDK | `C:\Users\ofere\AppData\Local\Android\Sdk` |
