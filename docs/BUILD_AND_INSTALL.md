# NXNative for Android — Build, Installation, and Troubleshooting Guide

This guide provides step-by-step instructions for building the Android NDK C++ core library, compiling the debug and release APKs, and configuring user-provided keys.

## 1. Prerequisites

- **Host Operating System**: Linux (Ubuntu 22.04+), macOS 13+, or Windows with WSL2.
- **Android NDK**: Version **r26c** (26.2.11394342) or newer.
- **CMake**: Version **3.22.1** or newer.
- **Java Development Kit**: JDK 17 (OpenJDK 17).
- **Android SDK**: Build-Tools 34.0.0, Platform API 34.
- **Target Device**: 64-bit ARM device (arm64-v8a) running Android 11.0 (API 30) or higher with Vulkan 1.3 driver support.

---

## 2. Command-Line Build Instructions

### Step 1: Clone the repository with submodules
```bash
git clone https://github.com/seedds/nxnative-android.git
cd nxnative-android
```

### Step 2: Build the Native C++ NDK Library (`libnxnative_core.so`)
You can build the native library directly using CMake or via Gradle:
```bash
export ANDROID_NDK=/path/to/android-ndk-r26c

# Standalone CMake build for verification
mkdir -p build-native && cd build-native
cmake ../android/app/src/main/cpp \
  -DCMAKE_TOOLCHAIN_FILE=${ANDROID_NDK}/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-30 \
  -DCMAKE_BUILD_TYPE=Release
cmake --build . -j$(nproc)
cd ..
```

### Step 3: Build the Android Application Package (APK)
```bash
cd android

# Build Debug APK
./gradlew assembleDebug

# Build Release APK
./gradlew assembleRelease
```
The compiled APK will be generated at:
`android/app/build/outputs/apk/release/app-release-unsigned.apk`

---

## 3. Sideloading & Running on Device

### Step 1: Install APK via ADB
```bash
adb install -r android/app/build/outputs/apk/release/app-release-unsigned.apk
```

### Step 2: Supply User Keys (`prod.keys`)
In accordance with Nintendo Switch security policies and fair use:
1. Launch the NXNative app on your Android device.
2. An interactive prompt will ask you to select your legally dumped `prod.keys`.
3. Select the file using Android's built-in file picker. The file is copied directly into the app's sandboxed private storage directory (`/data/data/org.nxnative.android/files/prod.keys`).

### Step 3: Load Executable
Select your legally dumped title or executable. The NSO rewriter will perform in-memory ARM64 patching and launch the Vulkan 1.3 presentation surface.

---

## 4. Troubleshooting & FAQ

| Problem | Likely Cause | Solution |
| :--- | :--- | :--- |
| `Vulkan 1.3 not supported` error | Device GPU driver supports only Vulkan 1.1 or 1.2 | Update your device system firmware or use an Adreno 6xx/7xx or Mali-G7x+ device. |
| Black screen on launch | Missing or corrupted `prod.keys` | Ensure your console keys file contains valid `header_key` and `titlekek` entries (>512 bytes). |
| Crash during NSO rewriting | Compressed NSO segment without LZ4 library | Ensure all NSO segments have flags & 0x7 resolved or use uncompressed ELF/NSO builds. |
| Audio crackling / underruns | Android power governor throttling background threads | Set Android Battery Optimization to "Unrestricted" for NXNative. |
