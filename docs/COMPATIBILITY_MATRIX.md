# NXNative for Android — Compatibility Matrix

This document records the verification and support status of game software, Horizon OS system services, NVN graphics capabilities, and hardware targets.

## 1. Horizon OS System Services (HLE)

| Service Name | Port Name | Implementation Status | Notes |
| :--- | :--- | :--- | :--- |
| **Virtual Interface (VI)** | `vi:m`, `vi:u` | **Fully Implemented** | Display layer creation, vsync synchronization, display buffer acquisition. |
| **NVHOST GPU Control** | `nvhost:ctrl_gpu` | **Fully Implemented** | GPU channel initialization, characteristics query, clock throttling queries. |
| **NVHOST Memory Allocator**| `nvhost:as_gpu` | **Fully Implemented** | GPU virtual memory address space mapping and unmapping. |
| **NVHOST Video Decoder** | `nvhost:nvdec` | **Partially Implemented**| Hardware-accelerated VP9/H.264 video decoding mapped to MediaCodec. |
| **Human Interface Device** | `hid` | **Fully Implemented** | Full 7-entry Joy-Con / Pro Controller ring buffer in shared memory. |
| **Audio Renderer** | `audren:u` | **Fully Implemented** | Multi-channel audio mixing feed to Oboe / AAudio at 48kHz. |
| **Account Manager** | `acc:u0` | **Fully Implemented** | Emulates default local user profile for game saves. |
| **Settings System** | `set:sys` | **Fully Implemented** | Returns system language, region, color scheme, and volume level. |
| **File System Proxy** | `fspr:pr`, `fsp-srv` | **Fully Implemented** | RomFS mounting and SaveData redirect to app-private internal storage. |
| **Network Sockets** | `bsd:s`, `bsd:u` | **Partially Implemented**| Offline socket stubs; multiplayer network loopback supported. |

---

## 2. NVN Graphics API Feature Support

| NVN Feature | Vulkan 1.3 Mapping | Support Level | Hardware Considerations |
| :--- | :--- | :--- | :--- |
| **Texture Formats (RGBA, sRGB, HDR)** | `VkFormat` direct mapping | **Complete** | All uncompressed and float formats natively supported. |
| **ASTC Texture Compression** | `VK_FORMAT_ASTC_4x4_UNORM_BLOCK` | **Complete** | Universally supported across Adreno and Mali hardware. |
| **BCn (DXT/BPTC) Texture Compression** | `VK_FORMAT_BC7_UNORM_BLOCK` | **Supported** | Native on Adreno (`VK_EXT_texture_compression_bptc`), compute fallback on Mali. |
| **Dynamic Viewport & Scissor** | `vkCmdSetViewport`, `vkCmdSetScissor` | **Complete** | Zero driver overhead. |
| **Depth / Stencil States** | `VkPipelineDepthStencilStateCreateInfo` | **Complete** | Matches Maxwell depth testing equations. |
| **Sampler Filtering (Anisotropy 16x)**| `VkSamplerCreateInfo` | **Complete** | Anisotropic filtering fully enabled up to 16x. |
| **Command Buffers & Queues** | `VkCommandBuffer`, `VkQueue` | **Complete** | Native execution via one-time submit command pools. |
| **GPU-CPU Synchronization** | `VkSemaphore` (Timeline Semaphores) | **Complete** | Monotonically increasing sync points match Horizon sync tokens. |

---

## 3. Hardware SoC Compatibility Tiers

| Tier | Chipset Example | GPU | Expected Performance Target |
| :--- | :--- | :--- | :--- |
| **Tier 1 (Flagship / 60 FPS Target)** | Snapdragon 8 Gen 3, Gen 2 | Adreno 750 / 740 | Full 60 FPS docked/handheld, full BCn native support, sub-7ms frame times. |
| **Tier 1 (Flagship / 60 FPS Target)** | MediaTek Dimensity 9300, 9200+ | Immortalis-G720 / G715 | Full 60 FPS target with high-throughput ASTC textures and ray tracing units. |
| **Tier 2 (High Performance / 30-60 FPS)** | Google Tensor G3, G4 | Immortalis-G715 | Solid 30-60 FPS; pipeline caching heavily recommended. |
| **Tier 2 (High Performance / 30-60 FPS)** | Samsung Exynos 2400 | Xclipse 940 (AMD RDNA3) | Full Vulkan 1.3 support, native BCn + ASTC dual support. |
| **Tier 3 (Mid-range / 30 FPS Target)** | Snapdragon 7+ Gen 2 | Adreno 725 | Handheld 720p mode recommended for stable thermal headroom. |
