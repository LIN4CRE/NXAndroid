/**
 * NXNative for Android — JNI Bridge to Android Platform & App Shell
 * @license GPL-2.0-or-later
 */

#include <jni.h>
#include <android/native_window.h>
#include <android/native_window_jni.h>
#include <android/log.h>
#include <string>

#include "nxnative/nso_rewriter.hpp"
#include "nxnative/horizon_kernel.hpp"
#include "nxnative/nvn_vulkan.hpp"
#include "nxnative/audio_oboe.hpp"
#include "nxnative/input_manager.hpp"

#define LOG_TAG "NXNative-JNI"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

extern "C" {

JNIEXPORT jboolean JNICALL
Java_org_nxnative_android_MainActivity_nativeInitKernel(JNIEnv* env, jobject thiz) {
    LOGI("JNI: Initializing NXNative Horizon Kernel...");
    nxnative::horizon::HorizonKernel::instance().initialize();
    nxnative::audio::AudioEngine::instance().initialize();
    return JNI_TRUE;
}

JNIEXPORT jboolean JNICALL
Java_org_nxnative_android_VulkanSurfaceView_nativeInitVulkan(JNIEnv* env, jobject thiz, jobject surface) {
    ANativeWindow* window = ANativeWindow_fromSurface(env, surface);
    if (!window) {
        LOGE("Failed to get ANativeWindow from Android Surface");
        return JNI_FALSE;
    }

    LOGI("JNI: Initializing Vulkan with ANativeWindow (%p)...", window);
    bool ok = nxnative::gpu::VulkanBackend::instance().initialize(window);
    return ok ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT jboolean JNICALL
Java_org_nxnative_android_MainActivity_nativeLoadExecutable(
    JNIEnv* env, jobject thiz, jbyteArray nso_bytes, jint length) {
    
    jbyte* buffer = env->GetByteArrayElements(nso_bytes, nullptr);
    if (!buffer) return JNI_FALSE;

    LOGI("JNI: Loading guest NSO binary (%d bytes)...", length);
    std::span<const uint8_t> span(reinterpret_cast<const uint8_t*>(buffer), length);

    auto rewriter = std::make_unique<nxnative::loader::NsoRewriter>(span);
    bool ok = rewriter->parse_header() &&
              rewriter->decompress_segments() &&
              rewriter->allocate_dual_mapping() &&
              rewriter->apply_relocations() &&
              rewriter->patch_arm64_instructions();

    env->ReleaseByteArrayElements(nso_bytes, buffer, JNI_ABORT);
    return ok ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT void JNICALL
Java_org_nxnative_android_MainActivity_nativeSendButtonEvent(
    JNIEnv* env, jobject thiz, jint button, jboolean pressed) {
    nxnative::input::InputManager::instance().update_button(
        static_cast<nxnative::input::ControllerButton>(button), pressed);
}

JNIEXPORT void JNICALL
Java_org_nxnative_android_MainActivity_nativeSendStickEvent(
    JNIEnv* env, jobject thiz, jboolean is_left, jfloat x, jfloat y) {
    if (is_left) {
        nxnative::input::InputManager::instance().update_left_stick(x, y);
    } else {
        nxnative::input::InputManager::instance().update_right_stick(x, y);
    }
}

JNIEXPORT jdouble JNICALL
Java_org_nxnative_android_MainActivity_nativeGetFrameTime(JNIEnv* env, jobject thiz) {
    return nxnative::gpu::VulkanBackend::instance().get_last_frame_time();
}

} // extern "C"
