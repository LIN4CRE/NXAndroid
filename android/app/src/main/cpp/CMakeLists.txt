cmake_minimum_required(VERSION 3.22.1)
project(nxnative_android LANGUAGES CXX C)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Compiler optimization flags for maximum performance parity with native execution
add_compile_options(
    -O3
    -flto
    -fvisibility=hidden
    -fvisibility-inlines-hidden
    -Wall
    -Wextra
    -Wno-unused-parameter
    -DVK_USE_PLATFORM_ANDROID_KHR
)

add_link_options(
    -flto
    -Wl,--gc-sections
    -Wl,--as-needed
)

include_directories(
    include
    ${ANDROID_NDK}/sources/android/native_app_glue
)

# Core native runtime sources
set(NXNATIVE_SOURCES
    src/nso_rewriter.cpp
    src/horizon_kernel.cpp
    src/nvn_vulkan.cpp
    src/maxwell_shader.cpp
    src/audio_oboe.cpp
    src/input_manager.cpp
    src/jni_bridge.cpp
)

add_library(nxnative_core SHARED ${NXNATIVE_SOURCES})

# Target Android API 30+ (Android 11+) for Vulkan 1.3 and advanced memory management
target_compile_definitions(nxnative_core PRIVATE
    __ANDROID_MIN_SDK_VERSION__=30
    NXNATIVE_DEBUG=0
)

# Link against Android NDK native libraries
target_link_libraries(nxnative_core
    android
    vulkan
    log
    aaudio
    OpenSLES
    m
    dl
)
