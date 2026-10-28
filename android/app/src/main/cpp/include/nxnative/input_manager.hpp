/**
 * NXNative for Android — Native Input Subsystem & Controller Mapping
 * @license Apache-2.0
 */

#pragma once

#include <cstdint>
#include <atomic>
#include <vector>

namespace nxnative::input {

enum ControllerButton : uint32_t {
    BUTTON_A = 1 << 0,
    BUTTON_B = 1 << 1,
    BUTTON_X = 1 << 2,
    BUTTON_Y = 1 << 3,
    BUTTON_LSTICK = 1 << 4,
    BUTTON_RSTICK = 1 << 5,
    BUTTON_L = 1 << 6,
    BUTTON_R = 1 << 7,
    BUTTON_ZL = 1 << 8,
    BUTTON_ZR = 1 << 9,
    BUTTON_PLUS = 1 << 10,
    BUTTON_MINUS = 1 << 11,
    BUTTON_DPAD_LEFT = 1 << 12,
    BUTTON_DPAD_UP = 1 << 13,
    BUTTON_DPAD_RIGHT = 1 << 14,
    BUTTON_DPAD_DOWN = 1 << 15,
};

struct TouchPoint {
    uint32_t id;
    float x;
    float y;
    float pressure;
};

struct AnalogStickState {
    float x; // [-1.0, 1.0]
    float y; // [-1.0, 1.0]
};

struct MotionState {
    float accel_x, accel_y, accel_z;
    float gyro_x, gyro_y, gyro_z;
};

class InputManager {
public:
    static InputManager& instance();

    void update_button(ControllerButton button, bool pressed);
    void update_left_stick(float x, float y);
    void update_right_stick(float x, float y);
    void update_touch(const std::vector<TouchPoint>& touches);
    void update_motion(const MotionState& motion);

    // Read states for Horizon hid:shared_memory
    uint32_t get_button_mask() const { return button_mask_.load(); }
    AnalogStickState get_left_stick() const;
    AnalogStickState get_right_stick() const;

private:
    InputManager() = default;

    std::atomic<uint32_t> button_mask_{0};
    std::atomic<float> left_stick_x_{0.0f};
    std::atomic<float> left_stick_y_{0.0f};
    std::atomic<float> right_stick_x_{0.0f};
    std::atomic<float> right_stick_y_{0.0f};
};

} // namespace nxnative::input
