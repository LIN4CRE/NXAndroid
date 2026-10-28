# NXNative for Android — Architecture and Compatibility Report

## 1. Executive Summary & Original Repository Audit

The original **`seedds/nxnative`** project demonstrated a breakthrough approach to running Nintendo Switch software on Apple Silicon hardware (iOS, iPadOS, macOS): **re-execution without dynamic interpretation**. Because both the Nintendo Switch (NVIDIA Tegra X1) and modern Apple devices share the 64-bit ARM architecture (ARM64 / AArch64), game binaries (`.nso`) can be statically rewritten and linked to execute directly on the host CPU.

However, the original implementation is deeply intertwined with Apple-proprietary platforms:
1. **Graphics**: Translates low-level NVN API calls to Apple's **Metal** graphics framework and uses a multi-step shader pipeline (Maxwell bytecode $\to$ Ryujinx IR $\to$ SPIR-V $\to$ SPIRV-Cross $\to$ Metal Shading Language MSL $\to$ `metallib`).
2. **Binary Packaging**: Packages rewritten game code as Apple Mach-O dylibs/frameworks signed for `.ipa` bundles.
3. **Memory Management**: Uses Apple's Darwin kernel features (`pthread_jit_write_protect_np`, Mach virtual memory ports).
4. **OS Services**: Host Horizon OS High-Level Emulation (HLE) is tied to Objective-C / Swift runtimes and Darwin POSIX threads.

### The Android Port Mission
This Android port creates an equivalent native runtime for the Android ecosystem:
- **Vulkan 1.3** as the primary host graphics backend.
- **Direct Maxwell $\to$ SPIR-V 1.5 translation**, completely eliminating the expensive SPIRV-Cross $\to$ MSL translation step, giving Android superior cold-start shader compilation speeds.
- **Android Bionic Libc & NDK** runtime compatibility, properly managing Android's strict W^X memory policies via Linux `memfd_create()` and dual `mmap()`.
- **ARM64 ABI compliance**: Preserving Android's reserved `x18` register (used by Android's ShadowCallStack) and mapping guest TLS from `TPIDRRO_EL0` to Android Bionic's `TPIDR_EL0`.
- **Low-latency audio** via Google's native Oboe / AAudio C++ engine.

---

## 2. Platform Subsystem Mapping

| Subsystem | Original Apple Implementation (`seedds/nxnative`) | Android Native Port Implementation (`nxnative-android`) | Technical Rationale & Strategy |
| :--- | :--- | :--- | :--- |
| **CPU Architecture** | ARM64 (Apple Silicon A16/A17, M-series) | ARM64 (Qualcomm Kryo/Oryon, ARM Cortex-X/A) | Direct execution on native ARM64 cores without JIT or translation penalties. |
| **Binary Executable Format** | Mach-O dynamic library (.dylib) inside `.ipa` | ELF64 shared object (`.so`) linked via Android NDK | Uses standard Linux ELF format, avoiding any Mach-O emulation. |
| **Instruction Rewriting** | Rewrites SVC instructions to Mach trap / C ABI; adapts Apple TLS | Rewrites SVC #0 to direct branch (`BL`) to C trampoline; rewrites `TPIDRRO_EL0` to `TPIDR_EL0` | In Android, userland SVC triggers `SIGSYS` seccomp crashes; direct C branch yields 0-overhead dispatch. |
| **W^X Memory Enforcement** | `pthread_jit_write_protect_np()` toggling write/exec | `memfd_create()` + dual `mmap()` (one `PROT_READ\|PROT_WRITE`, one `PROT_READ\|PROT_EXEC`) | Android 11+ SELinux denies W+X in a single page. Dual shared memory mapping enables zero-copy patch & execute. |
| **Host Graphics API** | Apple Metal 3.1 | Vulkan 1.3 (`VK_KHR_timeline_semaphore`, `VK_KHR_synchronization2`) | Vulkan is the open, hardware-accelerated standard across Qualcomm Adreno and ARM Mali/Immortalis. |
| **Shader Compilation** | Maxwell $\to$ SPIR-V $\to$ SPIRV-Cross $\to$ MSL $\to$ `metallib` | Maxwell $\to$ SPIR-V 1.5 $\to$ `vkCreateShaderModule` | **Major Android Advantage**: Vulkan consumes SPIR-V natively. Eliminates intermediate C++ source generation and compiler spawn. |
| **Audio Engine** | AVAudioEngine / CoreAudio | Oboe / AAudio (Exclusive low-latency stream) | Provides sub-5ms roundtrip latency with lock-free ring buffering. |
| **Input / Gamepad** | GameController.framework (MFi / GCController) | Android `AInputEvent` + JNI `MotionEvent` / Gamepad API | Direct mapping of analog axes, digital buttons, and touch screen events. |
| **Key & Game Storage** | Documents folder / Sandbox file picker | Android Storage Access Framework (SAF) URI streaming | Scoped storage compliant. Private keys never leave app's internal sandbox. |

---

## 3. High-Risk Components & Mitigation Strategies

1. **Android W^X Security & Instruction Cache Coherency**:
   - *Risk*: Android kernels forbid simultaneous write and execute permissions. Writing code and calling it can cause cache inconsistency or SEGV.
   - *Mitigation*: We allocate an anonymous file in RAM via `syscall(__NR_memfd_create)`. We create two separate virtual memory mappings pointing to the exact same physical pages: a writable alias for relocating and patching, and an executable alias for execution. We execute `__builtin___clear_cache()` to flush instruction caches prior to execution.

2. **ARM64 Register ABI Conflicts (Register x18)**:
   - *Risk*: On Android, register `x18` is reserved by the platform for ShadowCallStack (SCS) buffer pointer. If a Switch game binary utilizes `x18` for general-purpose calculation, it could corrupt Android runtime state.
   - *Mitigation*: During the NSO rewrite pass, any instruction accessing `x18` is spilled to a dedicated per-thread context register spill slot or rewritten to an alternate temporary register.

3. **Vulkan Texture Format Diversity (ASTC vs BCn)**:
   - *Risk*: The Switch Tegra X1 GPU natively supports both desktop desktop BC1-BC7 (BPTC) and mobile ASTC textures. Qualcomm Adreno supports BCn via `VK_EXT_texture_compression_bptc`, but ARM Mali GPUs only support ASTC.
   - *Mitigation*: The Vulkan backend queries device capabilities during initialization. If a title requests BCn on a Mali device lacking BPTC, the runtime engages a high-throughput Compute Shader decompressor to transcode BCn blocks to ASTC or uncompressed RGBA.
