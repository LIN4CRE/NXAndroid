/**
 * NXNative for Android — Native Audio Subsystem using Oboe / AAudio
 * @license Apache-2.0
 */

#pragma once

#include <cstdint>
#include <cstddef>
#include <vector>
#include <atomic>
#include <memory>

namespace nxnative::audio {

struct AudioConfig {
    uint32_t sample_rate = 48000;
    uint32_t channel_count = 2; // Stereo
    uint32_t buffer_capacity_frames = 192; // Ultra low-latency target (4ms)
};

class AudioEngine {
public:
    static AudioEngine& instance();

    bool initialize(const AudioConfig& config = {});
    void shutdown();
    bool start();
    void pause();

    // Horizon audren PCM feed
    void submit_samples(const int16_t* pcm_data, size_t frame_count);
    
    [[nodiscard]] double get_latency_ms() const { return latency_ms_; }
    [[nodiscard]] uint32_t get_underrun_count() const { return underrun_count_.load(); }

private:
    AudioEngine() = default;
    ~AudioEngine() = default;

    AudioConfig config_{};
    std::atomic<bool> is_running_{false};
    std::atomic<uint32_t> underrun_count_{0};
    double latency_ms_ = 4.2;
    void* oboe_stream_ = nullptr;
};

} // namespace nxnative::audio
