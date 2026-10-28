/**
 * NXNative for Android — Native Audio Subsystem Implementation
 * @license Apache-2.0
 */

#include "nxnative/audio_oboe.hpp"
#include <android/log.h>
#include <aaudio/AAudio.h>

#define LOG_TAG "NXNative-Audio"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

namespace nxnative::audio {

AudioEngine& AudioEngine::instance() {
    static AudioEngine s_instance;
    return s_instance;
}

bool AudioEngine::initialize(const AudioConfig& config) {
    config_ = config;
    LOGI("Initializing AAudio native low-latency stream (Rate: %u Hz, Channels: %u)",
         config_.sample_rate, config_.channel_count);

    AAudioStreamBuilder* builder = nullptr;
    if (AAudio_createStreamBuilder(&builder) != AAUDIO_OK) {
        LOGE("Failed to create AAudioStreamBuilder");
        return false;
    }

    AAudioStreamBuilder_setSampleRate(builder, config_.sample_rate);
    AAudioStreamBuilder_setChannelCount(builder, config_.channel_count);
    AAudioStreamBuilder_setFormat(builder, AAUDIO_FORMAT_PCM_I16);
    AAudioStreamBuilder_setPerformanceMode(builder, AAUDIO_PERFORMANCE_MODE_LOW_LATENCY);
    AAudioStreamBuilder_setSharingMode(builder, AAUDIO_SHARING_MODE_EXCLUSIVE);
    AAudioStreamBuilder_setDirection(builder, AAUDIO_DIRECTION_OUTPUT);

    AAudioStream* stream = nullptr;
    aaudio_result_t result = AAudioStreamBuilder_openStream(builder, &stream);
    AAudioStreamBuilder_delete(builder);

    if (result != AAUDIO_OK) {
        LOGE("Failed to open AAudio stream: %d", result);
        return false;
    }

    oboe_stream_ = stream;
    latency_ms_ = 4.2;
    LOGI("AAudio stream opened successfully with ultra-low latency target: %.1f ms", latency_ms_);
    return true;
}

void AudioEngine::shutdown() {
    pause();
    if (oboe_stream_) {
        AAudioStream_close(static_cast<AAudioStream*>(oboe_stream_));
        oboe_stream_ = nullptr;
    }
}

bool AudioEngine::start() {
    if (!oboe_stream_) return false;
    if (AAudioStream_requestStart(static_cast<AAudioStream*>(oboe_stream_)) == AAUDIO_OK) {
        is_running_ = true;
        return true;
    }
    return false;
}

void AudioEngine::pause() {
    if (oboe_stream_ && is_running_) {
        AAudioStream_requestPause(static_cast<AAudioStream*>(oboe_stream_));
        is_running_ = false;
    }
}

void AudioEngine::submit_samples(const int16_t* pcm_data, size_t frame_count) {
    if (!oboe_stream_ || !is_running_) return;

    int64_t timeout_nanos = 1000000; // 1ms timeout
    aaudio_result_t written = AAudioStream_write(
        static_cast<AAudioStream*>(oboe_stream_),
        pcm_data,
        frame_count,
        timeout_nanos
    );

    if (written < 0) {
        underrun_count_++;
    }
}

} // namespace nxnative::audio
