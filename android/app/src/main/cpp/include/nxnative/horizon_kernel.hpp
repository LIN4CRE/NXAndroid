/**
 * NXNative for Android — Horizon OS Host Environment & Kernel HLE
 * @license GPL-2.0-or-later
 */

#pragma once

#include <cstdint>
#include <cstddef>
#include <atomic>
#include <mutex>
#include <condition_variable>
#include <unordered_map>
#include <memory>
#include <string>

namespace nxnative::horizon {

// Horizon OS Result Code
struct Result {
    uint32_t raw;
    constexpr Result(uint32_t val = 0) : raw(val) {}
    constexpr bool is_success() const { return raw == 0; }
    constexpr bool is_failure() const { return raw != 0; }
    constexpr uint32_t get_module() const { return raw & 0x1ff; }
    constexpr uint32_t get_description() const { return (raw >> 9) & 0x1fff; }
};

constexpr Result ResultSuccess = 0;
constexpr Result ResultTimedOut = 0xEA01;
constexpr Result ResultCancelled = 0xEC01;
constexpr Result ResultInvalidHandle = 0xE401;

// Thread context structure matching Horizon ARM64 TLS
struct GuestTls {
    uint8_t ipc_command_buffer[0x100];
    uint32_t thread_reserved;
    uint32_t thread_id;
    uint64_t thread_context_ptr;
};

// Syscall handler table and Horizon services
class HorizonKernel {
public:
    static HorizonKernel& instance();

    void initialize();
    void shutdown();

    // Core Horizon Syscalls (SVCs)
    Result svc_set_heap_size(uintptr_t* out_addr, size_t size);
    Result svc_set_memory_permission(uintptr_t addr, size_t size, uint32_t perm);
    Result svc_map_memory(uintptr_t dst, uintptr_t src, size_t size);
    Result svc_unmap_memory(uintptr_t dst, uintptr_t src, size_t size);
    Result svc_query_memory(void* info, void* page_info, uintptr_t addr);
    Result svc_create_thread(int32_t* out_handle, uintptr_t entry, uintptr_t arg, uintptr_t stack_top, int32_t priority, int32_t cpu_id);
    Result svc_start_thread(int32_t handle);
    void   svc_exit_thread();
    Result svc_sleep_thread(int64_t nanoseconds);
    Result svc_wait_synchronization(int32_t* out_index, const int32_t* handles, int32_t count, int64_t timeout_ns);
    Result svc_arbitrate_address(uint32_t type, uintptr_t address, uint32_t value);
    Result svc_connect_to_named_port(int32_t* out_handle, const char* name);
    Result svc_send_sync_request(int32_t handle);
    Result svc_close_handle(int32_t handle);

    // TLS management for Android Bionic
    GuestTls* get_current_guest_tls();
    void set_current_guest_tls(GuestTls* tls);

private:
    HorizonKernel() = default;
    ~HorizonKernel() = default;

    std::mutex kernel_mutex_;
    std::unordered_map<uintptr_t, std::condition_variable> futex_map_;
    uintptr_t guest_heap_base_ = 0;
    size_t guest_heap_size_ = 0;
};

// Assembly trampoline entry point called by patched BL in game code
extern "C" uint32_t nxnative_svc_dispatch(uint32_t svc_id, uint64_t x0, uint64_t x1, uint64_t x2, uint64_t x3);

} // namespace nxnative::horizon
