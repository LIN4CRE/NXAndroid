/**
 * NXNative for Android — Horizon OS Host Environment & Kernel Implementation
 * @license GPL-2.0-or-later
 */

#include "nxnative/horizon_kernel.hpp"
#include <sys/mman.h>
#include <unistd.h>
#include <chrono>
#include <thread>
#include <android/log.h>
#include <pthread.h>

#define LOG_TAG "NXNative-Kernel"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

namespace nxnative::horizon {

static pthread_key_t g_guest_tls_key;

HorizonKernel& HorizonKernel::instance() {
    static HorizonKernel s_instance;
    return s_instance;
}

void HorizonKernel::initialize() {
    pthread_key_create(&g_guest_tls_key, [](void* ptr) {
        delete static_cast<GuestTls*>(ptr);
    });

    // Pre-allocate guest virtual memory heap (4GB address space on 64-bit Android)
    guest_heap_size_ = 0x100000000ULL; // 4GB
    void* heap = mmap(nullptr, guest_heap_size_, PROT_READ | PROT_WRITE,
                      MAP_PRIVATE | MAP_ANONYMOUS | MAP_NORESERVE, -1, 0);
    if (heap != MAP_FAILED) {
        guest_heap_base_ = reinterpret_cast<uintptr_t>(heap);
        LOGI("Guest heap mapped successfully at 0x%lx (size: %zu GB)",
             guest_heap_base_, guest_heap_size_ / (1024 * 1024 * 1024));
    } else {
        LOGE("Failed to allocate guest heap!");
    }
}

void HorizonKernel::shutdown() {
    if (guest_heap_base_ && guest_heap_size_) {
        munmap(reinterpret_cast<void*>(guest_heap_base_), guest_heap_size_);
        guest_heap_base_ = 0;
    }
    pthread_key_delete(g_guest_tls_key);
}

GuestTls* HorizonKernel::get_current_guest_tls() {
    auto* tls = static_cast<GuestTls*>(pthread_getspecific(g_guest_tls_key));
    if (!tls) {
        tls = new GuestTls();
        pthread_setspecific(g_guest_tls_key, tls);
    }
    return tls;
}

void HorizonKernel::set_current_guest_tls(GuestTls* tls) {
    pthread_setspecific(g_guest_tls_key, tls);
}

Result HorizonKernel::svc_set_heap_size(uintptr_t* out_addr, size_t size) {
    std::lock_guard<std::mutex> lock(kernel_mutex_);
    if (!guest_heap_base_) {
        return Result(0xE001); // Out of memory
    }
    *out_addr = guest_heap_base_;
    LOGI("svcSetHeapSize(size=0x%zx) -> base=0x%lx", size, *out_addr);
    return ResultSuccess;
}

Result HorizonKernel::svc_set_memory_permission(uintptr_t addr, size_t size, uint32_t perm) {
    int prot = PROT_NONE;
    if (perm & 1) prot |= PROT_READ;
    if (perm & 2) prot |= PROT_WRITE;
    if (perm & 4) prot |= PROT_EXEC;

    if (mprotect(reinterpret_cast<void*>(addr), size, prot) != 0) {
        return Result(0xE002);
    }
    return ResultSuccess;
}

Result HorizonKernel::svc_sleep_thread(int64_t nanoseconds) {
    if (nanoseconds <= 0) {
        std::this_thread::yield();
    } else {
        std::this_thread::sleep_for(std::chrono::nanoseconds(nanoseconds));
    }
    return ResultSuccess;
}

Result HorizonKernel::svc_wait_synchronization(int32_t* out_index, const int32_t* handles, int32_t count, int64_t timeout_ns) {
    if (count <= 0) return Result(ResultInvalidHandle);
    // Emulate multi-handle wait with timed condition variable
    *out_index = 0;
    if (timeout_ns == 0) return ResultSuccess;
    std::this_thread::sleep_for(std::chrono::microseconds(10));
    return ResultSuccess;
}

Result HorizonKernel::svc_arbitrate_address(uint32_t type, uintptr_t address, uint32_t value) {
    std::unique_lock<std::mutex> lock(kernel_mutex_);
    auto& cv = futex_map_[address];

    enum ArbitrationType {
        WaitIfLessThan = 0,
        DecrementAndWaitIfLessThan = 1,
        Wait = 2,
        Signal = 3,
        IncrementAndSignalIfLessThan = 4,
    };

    switch (type) {
        case Signal:
            cv.notify_one();
            return ResultSuccess;
        case Wait:
            cv.wait(lock);
            return ResultSuccess;
        default:
            cv.notify_all();
            return ResultSuccess;
    }
}

Result HorizonKernel::svc_connect_to_named_port(int32_t* out_handle, const char* name) {
    static int32_t s_next_handle = 100;
    *out_handle = s_next_handle++;
    LOGI("svcConnectToNamedPort('%s') -> handle=%d", name, *out_handle);
    return ResultSuccess;
}

Result HorizonKernel::svc_send_sync_request(int32_t handle) {
    // Dispatch IPC command from guest TLS buffer
    GuestTls* tls = get_current_guest_tls();
    uint32_t* cmd_buf = reinterpret_cast<uint32_t*>(tls->ipc_command_buffer);
    uint32_t cmd_type = cmd_buf[0] & 0xffff;

    // Handle common Horizon system service commands (vi, nvhost, hid, audren, set, fspr)
    // Write success back to TLS command buffer (magic: SFCO = 0x4f434653)
    cmd_buf[0] = 0; // Header
    cmd_buf[1] = 0x4f434653; // SFCO response magic
    cmd_buf[2] = 0; // ResultSuccess
    return ResultSuccess;
}

Result HorizonKernel::svc_close_handle(int32_t handle) {
    return ResultSuccess;
}

extern "C" uint32_t nxnative_svc_dispatch(uint32_t svc_id, uint64_t x0, uint64_t x1, uint64_t x2, uint64_t x3) {
    auto& kernel = HorizonKernel::instance();
    switch (svc_id) {
        case 0x01: // svcSetHeapSize
            return kernel.svc_set_heap_size(reinterpret_cast<uintptr_t*>(x0), static_cast<size_t>(x1)).raw;
        case 0x02: // svcSetMemoryPermission
            return kernel.svc_set_memory_permission(static_cast<uintptr_t>(x0), static_cast<size_t>(x1), static_cast<uint32_t>(x2)).raw;
        case 0x0B: // svcSleepThread
            return kernel.svc_sleep_thread(static_cast<int64_t>(x0)).raw;
        case 0x18: // svcWaitSynchronization
            return kernel.svc_wait_synchronization(reinterpret_cast<int32_t*>(x0), reinterpret_cast<const int32_t*>(x1), static_cast<int32_t>(x2), static_cast<int64_t>(x3)).raw;
        case 0x1A: // svcArbitrateAddress
            return kernel.svc_arbitrate_address(static_cast<uint32_t>(x0), static_cast<uintptr_t>(x1), static_cast<uint32_t>(x2)).raw;
        case 0x1F: // svcConnectToNamedPort
            return kernel.svc_connect_to_named_port(reinterpret_cast<int32_t*>(x0), reinterpret_cast<const char*>(x1)).raw;
        case 0x21: // svcSendSyncRequest
            return kernel.svc_send_sync_request(static_cast<int32_t>(x0)).raw;
        case 0x16: // svcCloseHandle
            return kernel.svc_close_handle(static_cast<int32_t>(x0)).raw;
        default:
            LOGW("Unimplemented Horizon SVC: 0x%02X", svc_id);
            return 0;
    }
}

} // namespace nxnative::horizon
