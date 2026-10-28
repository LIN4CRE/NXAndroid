/**
 * NXNative for Android — NVN Graphics API to Vulkan 1.3 Translation Engine
 * @license MIT / Apache-2.0
 */

#pragma once

#include <vulkan/vulkan.h>
#include <cstdint>
#include <cstddef>
#include <vector>
#include <memory>
#include <unordered_map>
#include <mutex>

namespace nxnative::gpu {

// Core NVN Types and Structures
enum NVNformat : uint32_t {
    NVN_FORMAT_NONE = 0,
    NVN_FORMAT_RGBA8 = 1,
    NVN_FORMAT_RGBA8_SRGB = 2,
    NVN_FORMAT_RGB10A2 = 3,
    NVN_FORMAT_RGBA16F = 9,
    NVN_FORMAT_RGBA32F = 12,
    NVN_FORMAT_DEPTH24_STENCIL8 = 14,
    NVN_FORMAT_DEPTH32F = 15,
    NVN_FORMAT_ASTC_4x4 = 23,
    NVN_FORMAT_ASTC_8x8 = 24,
    NVN_FORMAT_BC7 = 22,
};

enum NVNshaderStageBits : uint32_t {
    NVN_SHADER_STAGE_VERTEX_BIT = 0x01,
    NVN_SHADER_STAGE_FRAGMENT_BIT = 0x02,
    NVN_SHADER_STAGE_GEOMETRY_BIT = 0x04,
    NVN_SHADER_STAGE_TESS_CONTROL_BIT = 0x08,
    NVN_SHADER_STAGE_TESS_EVAL_BIT = 0x10,
    NVN_SHADER_STAGE_COMPUTE_BIT = 0x20,
};

struct NVNdeviceBuilder {};
struct NVNdevice {
    VkInstance instance = VK_NULL_HANDLE;
    VkPhysicalDevice physical_device = VK_NULL_HANDLE;
    VkDevice device = VK_NULL_HANDLE;
    VkQueue graphics_queue = VK_NULL_HANDLE;
    uint32_t queue_family_index = 0;
    VkCommandPool command_pool = VK_NULL_HANDLE;
    VkPipelineCache pipeline_cache = VK_NULL_HANDLE;
};

struct NVNqueueBuilder {};
struct NVNqueue {
    NVNdevice* device = nullptr;
    VkQueue vk_queue = VK_NULL_HANDLE;
    VkSemaphore timeline_semaphore = VK_NULL_HANDLE;
    uint64_t current_timeline_value = 0;
};

struct NVNcommandBuffer {
    NVNdevice* device = nullptr;
    VkCommandBuffer vk_cmd = VK_NULL_HANDLE;
    VkRenderPass current_render_pass = VK_NULL_HANDLE;
    VkFramebuffer current_framebuffer = VK_NULL_HANDLE;
    bool in_render_pass = false;
};

struct NVNmemoryPool {
    VkDeviceMemory vk_memory = VK_NULL_HANDLE;
    size_t size = 0;
    void* mapped_ptr = nullptr;
    uint32_t memory_type_index = 0;
};

struct NVNtexture {
    VkImage vk_image = VK_NULL_HANDLE;
    VkImageView vk_view = VK_NULL_HANDLE;
    VkFormat vk_format = VK_FORMAT_UNDEFINED;
    VkExtent3D extent = {0, 0, 0};
    uint32_t mip_levels = 1;
};

struct NVNsampler {
    VkSampler vk_sampler = VK_NULL_HANDLE;
};

struct NVNprogram {
    VkShaderModule vertex_module = VK_NULL_HANDLE;
    VkShaderModule fragment_module = VK_NULL_HANDLE;
    VkPipelineLayout pipeline_layout = VK_NULL_HANDLE;
    VkPipeline pipeline = VK_NULL_HANDLE;
};

class VulkanBackend {
public:
    static VulkanBackend& instance();

    bool initialize(ANativeWindow* window);
    void shutdown();

    // NVN C-API Equivalents
    bool nvnDeviceInitialize(NVNdevice* dev);
    bool nvnQueueInitialize(NVNqueue* queue, NVNdevice* dev);
    bool nvnCommandBufferInitialize(NVNcommandBuffer* cmd, NVNdevice* dev);
    bool nvnMemoryPoolInitialize(NVNmemoryPool* pool, NVNdevice* dev, size_t size, uint32_t flags);
    bool nvnTextureInitialize(NVNtexture* tex, NVNdevice* dev, NVNformat format, uint32_t width, uint32_t height, uint32_t depth);
    bool nvnSamplerInitialize(NVNsampler* sampler, NVNdevice* dev);
    bool nvnProgramInitialize(NVNprogram* prog, NVNdevice* dev, const uint32_t* vs_spirv, size_t vs_size, const uint32_t* fs_spirv, size_t fs_size);

    void nvnCommandBufferBeginRecording(NVNcommandBuffer* cmd);
    void nvnCommandBufferEndRecording(NVNcommandBuffer* cmd);
    void nvnQueueSubmitCommands(NVNqueue* queue, int num_commands, NVNcommandBuffer* const* cmds);
    void nvnQueuePresentTexture(NVNqueue* queue, NVNtexture* tex);

    // Frame synchronization & metrics
    void record_frame_time(double ms);
    double get_last_frame_time() const { return last_frame_time_ms_; }

private:
    VulkanBackend() = default;
    ~VulkanBackend() = default;

    VkInstance instance_ = VK_NULL_HANDLE;
    VkPhysicalDevice physical_device_ = VK_NULL_HANDLE;
    VkDevice device_ = VK_NULL_HANDLE;
    VkSurfaceKHR surface_ = VK_NULL_HANDLE;
    VkSwapchainKHR swapchain_ = VK_NULL_HANDLE;
    std::vector<VkImage> swapchain_images_;
    std::vector<VkImageView> swapchain_image_views_;
    double last_frame_time_ms_ = 16.6;
};

} // namespace nxnative::gpu
