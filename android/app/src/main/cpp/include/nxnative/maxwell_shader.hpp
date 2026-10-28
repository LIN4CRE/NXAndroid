/**
 * NXNative for Android — Maxwell GPU Shader to SPIR-V Intermediate Translator
 * @license GPL-2.0-or-later
 */

#pragma once

#include <cstdint>
#include <cstddef>
#include <vector>
#include <span>
#include <string>
#include <unordered_map>

namespace nxnative::shader {

enum class ShaderStage {
    Vertex,
    TessellationControl,
    TessellationEvaluation,
    Geometry,
    Fragment,
    Compute
};

struct TranslationOptions {
    bool enable_fast_math = true;
    bool enable_pipeline_cache = true;
    uint32_t target_spirv_version = 0x00010500; // SPIR-V 1.5
    bool emit_debug_names = false;
};

struct ShaderTranslationResult {
    bool success = false;
    std::vector<uint32_t> spirv_bytecode;
    std::string disassembly;
    std::string error_message;
    uint32_t instruction_count = 0;
    uint32_t uniform_buffer_mask = 0;
    uint32_t sampled_texture_mask = 0;
};

class MaxwellShaderTranslator {
public:
    explicit MaxwellShaderTranslator(TranslationOptions options = {});
    ~MaxwellShaderTranslator() = default;

    ShaderTranslationResult translate(ShaderStage stage, std::span<const uint8_t> maxwell_code);
    
    // Cache management
    static bool save_pipeline_cache(const std::string& cache_path, const void* data, size_t size);
    static std::vector<uint8_t> load_pipeline_cache(const std::string& cache_path);

private:
    TranslationOptions options_;
};

} // namespace nxnative::shader
