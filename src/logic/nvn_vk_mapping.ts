/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// NVN to Vulkan Format & State Mapping

export enum NvnFormat {
  NVN_FORMAT_NONE = 0,
  NVN_FORMAT_RGBA8 = 1,
  NVN_FORMAT_RGBA8_SRGB = 2,
  NVN_FORMAT_RGB10A2 = 3,
  NVN_FORMAT_RGB565 = 4,
  NVN_FORMAT_R8 = 5,
  NVN_FORMAT_RG8 = 6,
  NVN_FORMAT_R16F = 7,
  NVN_FORMAT_RG16F = 8,
  NVN_FORMAT_RGBA16F = 9,
  NVN_FORMAT_R32F = 10,
  NVN_FORMAT_RG32F = 11,
  NVN_FORMAT_RGBA32F = 12,
  NVN_FORMAT_DEPTH16 = 13,
  NVN_FORMAT_DEPTH24_STENCIL8 = 14,
  NVN_FORMAT_DEPTH32F = 15,
  NVN_FORMAT_DEPTH32F_STENCIL8 = 16,
  // Compressed formats
  NVN_FORMAT_BC1_RGBA = 17,
  NVN_FORMAT_BC2 = 18,
  NVN_FORMAT_BC3 = 19,
  NVN_FORMAT_BC4 = 20,
  NVN_FORMAT_BC5 = 21,
  NVN_FORMAT_BC7 = 22,
  NVN_FORMAT_ASTC_4x4 = 23,
  NVN_FORMAT_ASTC_8x8 = 24,
}

export enum VkFormat {
  VK_FORMAT_UNDEFINED = 0,
  VK_FORMAT_R8G8B8A8_UNORM = 37,
  VK_FORMAT_R8G8B8A8_SRGB = 43,
  VK_FORMAT_A2R10G10B10_UNORM_PACK32 = 58,
  VK_FORMAT_R5G6B5_UNORM_PACK16 = 84,
  VK_FORMAT_R8_UNORM = 9,
  VK_FORMAT_R8G8_UNORM = 16,
  VK_FORMAT_R16_SFLOAT = 76,
  VK_FORMAT_R16G16_SFLOAT = 83,
  VK_FORMAT_R16G16B16A16_SFLOAT = 97,
  VK_FORMAT_R32_SFLOAT = 100,
  VK_FORMAT_R32G32_SFLOAT = 103,
  VK_FORMAT_R32G32B32A32_SFLOAT = 109,
  VK_FORMAT_D16_UNORM = 124,
  VK_FORMAT_D24_UNORM_S8_UINT = 129,
  VK_FORMAT_D32_SFLOAT = 126,
  VK_FORMAT_D32_SFLOAT_S8_UINT = 130,
  VK_FORMAT_BC1_RGBA_UNORM_BLOCK = 133,
  VK_FORMAT_BC2_UNORM_BLOCK = 135,
  VK_FORMAT_BC3_UNORM_BLOCK = 137,
  VK_FORMAT_BC4_UNORM_BLOCK = 139,
  VK_FORMAT_BC5_UNORM_BLOCK = 141,
  VK_FORMAT_BC7_UNORM_BLOCK = 145,
  VK_FORMAT_ASTC_4x4_UNORM_BLOCK = 157,
  VK_FORMAT_ASTC_8x8_UNORM_BLOCK = 165,
}

export interface FormatTranslationResult {
  nvnFormat: NvnFormat;
  vkFormat: VkFormat;
  formatName: string;
  isCompressed: boolean;
  isDepthStencil: boolean;
  bytesPerBlockOrPixel: number;
  adrenoSupported: boolean;
  maliSupported: boolean;
}

export function translateNvnFormatToVk(format: NvnFormat): FormatTranslationResult {
  switch (format) {
    case NvnFormat.NVN_FORMAT_RGBA8:
      return { nvnFormat: format, vkFormat: VkFormat.VK_FORMAT_R8G8B8A8_UNORM, formatName: 'VK_FORMAT_R8G8B8A8_UNORM', isCompressed: false, isDepthStencil: false, bytesPerBlockOrPixel: 4, adrenoSupported: true, maliSupported: true };
    case NvnFormat.NVN_FORMAT_RGBA8_SRGB:
      return { nvnFormat: format, vkFormat: VkFormat.VK_FORMAT_R8G8B8A8_SRGB, formatName: 'VK_FORMAT_R8G8B8A8_SRGB', isCompressed: false, isDepthStencil: false, bytesPerBlockOrPixel: 4, adrenoSupported: true, maliSupported: true };
    case NvnFormat.NVN_FORMAT_RGBA16F:
      return { nvnFormat: format, vkFormat: VkFormat.VK_FORMAT_R16G16B16A16_SFLOAT, formatName: 'VK_FORMAT_R16G16B16A16_SFLOAT', isCompressed: false, isDepthStencil: false, bytesPerBlockOrPixel: 8, adrenoSupported: true, maliSupported: true };
    case NvnFormat.NVN_FORMAT_DEPTH24_STENCIL8:
      return { nvnFormat: format, vkFormat: VkFormat.VK_FORMAT_D24_UNORM_S8_UINT, formatName: 'VK_FORMAT_D24_UNORM_S8_UINT', isCompressed: false, isDepthStencil: true, bytesPerBlockOrPixel: 4, adrenoSupported: true, maliSupported: true };
    case NvnFormat.NVN_FORMAT_DEPTH32F:
      return { nvnFormat: format, vkFormat: VkFormat.VK_FORMAT_D32_SFLOAT, formatName: 'VK_FORMAT_D32_SFLOAT', isCompressed: false, isDepthStencil: true, bytesPerBlockOrPixel: 4, adrenoSupported: true, maliSupported: true };
    case NvnFormat.NVN_FORMAT_BC7:
      // Note: On desktop/Tegra, BCn is native. On mobile (Adreno/Mali), ASTC is universal. Some Adreno 7xx support BCn directly via VK_EXT_texture_compression_bptc.
      return { nvnFormat: format, vkFormat: VkFormat.VK_FORMAT_BC7_UNORM_BLOCK, formatName: 'VK_FORMAT_BC7_UNORM_BLOCK', isCompressed: true, isDepthStencil: false, bytesPerBlockOrPixel: 16, adrenoSupported: true, maliSupported: false };
    case NvnFormat.NVN_FORMAT_ASTC_4x4:
      return { nvnFormat: format, vkFormat: VkFormat.VK_FORMAT_ASTC_4x4_UNORM_BLOCK, formatName: 'VK_FORMAT_ASTC_4x4_UNORM_BLOCK', isCompressed: true, isDepthStencil: false, bytesPerBlockOrPixel: 16, adrenoSupported: true, maliSupported: true };
    default:
      return { nvnFormat: format, vkFormat: VkFormat.VK_FORMAT_R8G8B8A8_UNORM, formatName: 'VK_FORMAT_R8G8B8A8_UNORM (Fallback)', isCompressed: false, isDepthStencil: false, bytesPerBlockOrPixel: 4, adrenoSupported: true, maliSupported: true };
  }
}
