/**
 * NXNative for Android — ARM64 Executable Loader & Instruction Rewriter
 * @license GPL-2.0-or-later
 */

#pragma once

#include <cstdint>
#include <cstddef>
#include <span>
#include <string>
#include <vector>
#include <memory>

namespace nxnative::loader {

struct NsoSegment {
    uint32_t file_offset;
    uint32_t memory_offset;
    uint32_t decompressed_size;
    uint32_t compressed_size;
    uint32_t align;
};

struct NsoHeader {
    char magic[4]; // 'NSO0'
    uint32_t version;
    uint32_t flags;
    NsoSegment text;
    uint32_t module_offset;
    NsoSegment rodata;
    uint32_t module_file_size;
    NsoSegment data;
    uint32_t bss_size;
    uint8_t build_id[0x20];
    uint8_t text_sha256[0x20];
    uint8_t rodata_sha256[0x20];
    uint8_t data_sha256[0x20];
};

struct RewrittenModule {
    uintptr_t base_address;
    size_t total_size;
    void* rx_mapping; // Executable mapping
    void* rw_mapping; // Writable alias (dual-mmap via memfd_create for W^X enforcement)
    uintptr_t entry_point;
    size_t patched_svc_count;
    size_t patched_tls_count;
};

class NsoRewriter {
public:
    explicit NsoRewriter(std::span<const uint8_t> nso_data);
    ~NsoRewriter();

    bool parse_header();
    bool decompress_segments();
    bool allocate_dual_mapping();
    bool apply_relocations();
    bool patch_arm64_instructions();
    
    [[nodiscard]] const NsoHeader& header() const { return header_; }
    [[nodiscard]] const RewrittenModule& module() const { return module_; }

private:
    std::span<const uint8_t> raw_data_;
    NsoHeader header_{};
    RewrittenModule module_{};
    int memfd_ = -1;
    
    std::vector<uint8_t> decompressed_text_;
    std::vector<uint8_t> decompressed_rodata_;
    std::vector<uint8_t> decompressed_data_;

    bool patch_instruction(uint32_t* rw_ptr, uintptr_t guest_pc, uint32_t instruction);
};

} // namespace nxnative::loader
