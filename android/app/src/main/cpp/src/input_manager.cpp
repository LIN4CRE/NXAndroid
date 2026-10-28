/**
 * NXNative for Android — Native Input Subsystem Implementation
 * @license Apache-2.0
 */

#include "nxnative/input_manager.hpp"

namespace nxnative::input {

InputManager& InputManager::instance() {
    static InputManager s_instance;
    return s_instance;
}

void InputManager::update_button(ControllerButton button, bool pressed) {
    if (pressed) {
        button_mask_.fetch_or(button);
    } else {
        button_mask_.fetch_and(~button);
    }
}

void InputManager::update_left_stick(float x, float y) {
    left_stick_x_.store(x);
    left_stick_y_.store(y);
}

void InputManager::update_right_stick(float x, float y) {
    right_stick_x_.store(x);
    right_stick_y_.store(y);
}

void InputManager::update_touch(const std::vector<TouchPoint>& touches) {
    // Forwarded to Horizon hid:shared_memory touch array
}

void InputManager::update_motion(const MotionState& motion) {
    // Forwarded to Horizon hid sixaxis sensor buffer
}

AnalogStickState InputManager::get_left_stick() const {
    return {left_stick_x_.load(), left_stick_y_.load()};
}

AnalogStickState InputManager::get_right_stick() const {
    return {right_stick_x_.load(), right_stick_y_.load()};
}

} // namespace nxnative::input
