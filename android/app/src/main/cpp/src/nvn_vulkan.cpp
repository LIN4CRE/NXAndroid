/**
 * NXNative for Android — NVN to Vulkan 1.3 Translation Implementation
 * @license MIT / Apache-2.0
 */

#include "nxnative/nvn_vulkan.hpp"
#include <android/log.h>
#include <android/native_window.h>
#include <android/native_window_jni.h>
#include <cstring>
#include <vector>

#define LOG_TAG "NXNative-Vulkan"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

namespace nxnative::gpu {

static VkFormat translate_format(NVNformat format) {
    switch (format) {
        case NVN_FORMAT_RGBA8: return VK_FORMAT_R8G8B8A8_UNORM;
        case NVN_FORMAT_RGBA8_SRGB: return VK_FORMAT_R8G8B8A8_SRGB;
        case NVN_FORMAT_RGB10A2: return VK_FORMAT_A2R10G10B10_UNORM_PACK32;
        case NVN_FORMAT_RGBA16F: return VK_FORMAT_R16G16B16A16_SFLOAT;
        case NVN_FORMAT_RGBA32F: return VK_FORMAT_R32G32B32A32_SFLOAT;
        case NVN_FORMAT_DEPTH24_STENCIL8: return VK_FORMAT_D24_UNORM_S8_UINT;
        case NVN_FORMAT_DEPTH32F: return VK_FORMAT_D32_SFLOAT;
        case NVN_FORMAT_ASTC_4x4: return VK_FORMAT_ASTC_4x4_UNORM_BLOCK;
        case NVN_FORMAT_ASTC_8x8: return VK_FORMAT_ASTC_8x8_UNORM_BLOCK;
        case NVN_FORMAT_BC7: return VK_FORMAT_BC7_UNORM_BLOCK;
        default: return VK_FORMAT_R8G8B8A8_UNORM;
    }
}

VulkanBackend& VulkanBackend::instance() {
    static VulkanBackend s_instance;
    return s_instance;
}

bool VulkanBackend::initialize(ANativeWindow* window) {
    LOGI("Initializing NXNative Vulkan 1.3 backend on Android...");

    // Create VkInstance
    VkApplicationInfo app_info = {
        .sType = VK_STRUCTURE_TYPE_APPLICATION_INFO,
        .pApplicationName = "NXNative Android",
        .applicationVersion = VK_MAKE_VERSION(1, 0, 0),
        .pEngineName = "NXNative Engine",
        .engineVersion = VK_MAKE_VERSION(1, 0, 0),
        .apiVersion = VK_API_VERSION_1_3,
    };

    const char* instance_extensions[] = {
        "VK_KHR_surface",
        "VK_KHR_android_surface",
    };

    VkInstanceCreateInfo instance_info = {
        .sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO,
        .pApplicationInfo = &app_info,
        .enabledExtensionCount = 2,
        .ppEnabledExtensionNames = instance_extensions,
    };

    if (vkCreateInstance(&instance_info, nullptr, &instance_) != VK_SUCCESS) {
        LOGE("Failed to create Vulkan instance");
        return false;
    }

    // Pick physical device
    uint32_t gpu_count = 0;
    vkEnumeratePhysicalDevices(instance_, &gpu_count, nullptr);
    if (gpu_count == 0) {
        LOGE("No Vulkan physical devices found");
        return false;
    }

    std::vector<VkPhysicalDevice> gpus(gpu_count);
    vkEnumeratePhysicalDevices(instance_, &gpu_count, gpus.data());
    physical_device_ = gpus[0];

    VkPhysicalDeviceProperties props;
    vkGetPhysicalDeviceProperties(physical_device_, &props);
    LOGI("Selected Android GPU: %s (Driver Version: 0x%x, API: %d.%d)",
         props.deviceName, props.driverVersion,
         VK_VERSION_MAJOR(props.apiVersion), VK_VERSION_MINOR(props.apiVersion));

    // Create logical device with timeline semaphores and synchronization2 enabled
    float queue_priority = 1.0f;
    VkDeviceQueueCreateInfo queue_create_info = {
        .sType = VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO,
        .queueFamilyIndex = 0,
        .queueCount = 1,
        .pQueuePriorities = &queue_priority,
    };

    const char* device_extensions[] = {
        VK_KHR_SWAPCHAIN_EXTENSION_NAME,
        VK_KHR_TIMELINE_SEMAPHORE_EXTENSION_NAME,
        VK_KHR_SYNCHRONIZATION_2_EXTENSION_NAME,
    };

    VkPhysicalDeviceVulkan12Features vk12_features = {
        .sType = VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_2_FEATURES,
        .timelineSemaphore = VK_TRUE,
    };

    VkPhysicalDeviceFeatures2 device_features = {
        .sType = VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_FEATURES_2,
        .pNext = &vk12_features,
    };

    VkDeviceCreateInfo device_info = {
        .sType = VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO,
        .pNext = &device_features,
        .queueCreateInfoCount = 1,
        .pQueueCreateInfos = &queue_create_info,
        .enabledExtensionCount = 3,
        .ppEnabledExtensionNames = device_extensions,
    };

    if (vkCreateDevice(physical_device_, &device_info, nullptr, &device_) != VK_SUCCESS) {
        LOGE("Failed to create Vulkan logical device");
        return false;
    }

    LOGI("Vulkan 1.3 Logical Device successfully created for NXNative runtime");
    return true;
}

void VulkanBackend::shutdown() {
    if (device_) {
        vkDestroyDevice(device_, nullptr);
        device_ = VK_NULL_HANDLE;
    }
    if (instance_) {
        vkDestroyInstance(instance_, nullptr);
        instance_ = VK_NULL_HANDLE;
    }
}

bool VulkanBackend::nvnDeviceInitialize(NVNdevice* dev) {
    dev->instance = instance_;
    dev->physical_device = physical_device_;
    dev->device = device_;
    vkGetDeviceQueue(device_, 0, 0, &dev->graphics_queue);

    VkCommandPoolCreateInfo pool_info = {
        .sType = VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO,
        .flags = VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT,
        .queueFamilyIndex = 0,
    };
    vkCreateCommandPool(device_, &pool_info, nullptr, &dev->command_pool);
    return true;
}

bool VulkanBackend::nvnQueueInitialize(NVNqueue* queue, NVNdevice* dev) {
    queue->device = dev;
    queue->vk_queue = dev->graphics_queue;
    return true;
}

bool VulkanBackend::nvnCommandBufferInitialize(NVNcommandBuffer* cmd, NVNdevice* dev) {
    cmd->device = dev;
    VkCommandBufferAllocateInfo alloc_info = {
        .sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO,
        .commandPool = dev->command_pool,
        .level = VK_COMMAND_BUFFER_LEVEL_PRIMARY,
        .commandBufferCount = 1,
    };
    return vkAllocateCommandBuffers(dev->device, &alloc_info, &cmd->vk_cmd) == VK_SUCCESS;
}

bool VulkanBackend::nvnMemoryPoolInitialize(NVNmemoryPool* pool, NVNdevice* dev, size_t size, uint32_t flags) {
    pool->size = size;
    VkMemoryAllocateInfo alloc_info = {
        .sType = VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_INFO,
        .allocationSize = size,
        .memoryTypeIndex = 0,
    };
    if (vkAllocateMemory(dev->device, &alloc_info, nullptr, &pool->vk_memory) != VK_SUCCESS) {
        return false;
    }
    vkMapMemory(dev->device, pool->vk_memory, 0, size, 0, &pool->mapped_ptr);
    return true;
}

bool VulkanBackend::nvnTextureInitialize(NVNtexture* tex, NVNdevice* dev, NVNformat format, uint32_t width, uint32_t height, uint32_t depth) {
    tex->vk_format = translate_format(format);
    tex->extent = {width, height, depth};

    VkImageCreateInfo image_info = {
        .sType = VK_STRUCTURE_TYPE_IMAGE_CREATE_INFO,
        .imageType = depth > 1 ? VK_IMAGE_TYPE_3D : (height > 1 ? VK_IMAGE_TYPE_2D : VK_IMAGE_TYPE_1D),
        .format = tex->vk_format,
        .extent = tex->extent,
        .mipLevels = 1,
        .arrayLayers = 1,
        .samples = VK_SAMPLE_COUNT_1_BIT,
        .tiling = VK_IMAGE_TILING_OPTIMAL,
        .usage = VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT | VK_IMAGE_USAGE_SAMPLED_BIT | VK_IMAGE_USAGE_TRANSFER_DST_BIT,
    };
    return vkCreateImage(dev->device, &image_info, nullptr, &tex->vk_image) == VK_SUCCESS;
}

bool VulkanBackend::nvnSamplerInitialize(NVNsampler* sampler, NVNdevice* dev) {
    VkSamplerCreateInfo sampler_info = {
        .sType = VK_STRUCTURE_TYPE_SAMPLER_CREATE_INFO,
        .magFilter = VK_FILTER_LINEAR,
        .minFilter = VK_FILTER_LINEAR,
        .mipmapMode = VK_SAMPLER_MIPMAP_MODE_LINEAR,
        .addressModeU = VK_SAMPLER_ADDRESS_MODE_REPEAT,
        .addressModeV = VK_SAMPLER_ADDRESS_MODE_REPEAT,
        .addressModeW = VK_SAMPLER_ADDRESS_MODE_REPEAT,
    };
    return vkCreateSampler(dev->device, &sampler_info, nullptr, &sampler->vk_sampler) == VK_SUCCESS;
}

bool VulkanBackend::nvnProgramInitialize(NVNprogram* prog, NVNdevice* dev, const uint32_t* vs_spirv, size_t vs_size, const uint32_t* fs_spirv, size_t fs_size) {
    VkShaderModuleCreateInfo vs_info = {
        .sType = VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO,
        .codeSize = vs_size,
        .pCode = vs_spirv,
    };
    vkCreateShaderModule(dev->device, &vs_info, nullptr, &prog->vertex_module);

    VkShaderModuleCreateInfo fs_info = {
        .sType = VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO,
        .codeSize = fs_size,
        .pCode = fs_spirv,
    };
    vkCreateShaderModule(dev->device, &fs_info, nullptr, &prog->fragment_module);

    LOGI("Created Vulkan Shader Modules for NVN program (VS: %zu bytes, FS: %zu bytes)", vs_size, fs_size);
    return true;
}

void VulkanBackend::nvnCommandBufferBeginRecording(NVNcommandBuffer* cmd) {
    VkCommandBufferBeginInfo begin_info = {
        .sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO,
        .flags = VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT,
    };
    vkBeginCommandBuffer(cmd->vk_cmd, &begin_info);
}

void VulkanBackend::nvnCommandBufferEndRecording(NVNcommandBuffer* cmd) {
    vkEndCommandBuffer(cmd->vk_cmd);
}

void VulkanBackend::nvnQueueSubmitCommands(NVNqueue* queue, int num_commands, NVNcommandBuffer* const* cmds) {
    std::vector<VkCommandBuffer> vk_cmds(num_commands);
    for (int i = 0; i < num_commands; i++) {
        vk_cmds[i] = cmds[i]->vk_cmd;
    }

    VkSubmitInfo submit_info = {
        .sType = VK_STRUCTURE_TYPE_SUBMIT_INFO,
        .commandBufferCount = static_cast<uint32_t>(num_commands),
        .pCommandBuffers = vk_cmds.data(),
    };
    vkQueueSubmit(queue->vk_queue, 1, &submit_info, VK_NULL_HANDLE);
}

void VulkanBackend::nvnQueuePresentTexture(NVNqueue* queue, NVNtexture* tex) {
    // Present current swapchain image to Android surface
}

void VulkanBackend::record_frame_time(double ms) {
    last_frame_time_ms_ = ms;
}

} // namespace nxnative::gpu
