package org.nxnative.android

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.widget.FrameLayout
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var surfaceView: VulkanSurfaceView
    private lateinit var keyManager: KeyManager

    companion object {
        init {
            System.loadLibrary("nxnative_core")
        }
        private const val REQUEST_CODE_PICK_ROM = 1001
        private const val REQUEST_CODE_PICK_KEYS = 1002
    }

    external fun nativeInitKernel(): Boolean
    external fun nativeLoadExecutable(nsoBytes: ByteArray, length: Int): Boolean
    external fun nativeSendButtonEvent(button: Int, pressed: Boolean)
    external fun nativeSendStickEvent(isLeft: Boolean, x: Float, y: Float)
    external fun nativeGetFrameTime(): Double

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Hide system UI for immersive fullscreen gaming
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        )

        keyManager = KeyManager(this)
        nativeInitKernel()

        val rootLayout = FrameLayout(this)
        surfaceView = VulkanSurfaceView(this)
        rootLayout.addView(surfaceView)
        setContentView(rootLayout)

        if (!keyManager.hasValidKeys()) {
            Toast.makeText(this, "Select user-provided prod.keys to proceed", Toast.LENGTH_LONG).show()
            launchKeyPicker()
        }
    }

    private fun launchKeyPicker() {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
        }
        startActivityForResult(intent, REQUEST_CODE_PICK_KEYS)
    }

    fun launchRomPicker() {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
        }
        startActivityForResult(intent, REQUEST_CODE_PICK_ROM)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (resultCode == Activity.RESULT_OK && data?.data != null) {
            val uri: Uri = data.data!!
            if (requestCode == REQUEST_CODE_PICK_KEYS) {
                keyManager.importKeys(uri)
                Toast.makeText(this, "prod.keys imported securely into private storage", Toast.LENGTH_SHORT).show()
            } else if (requestCode == REQUEST_CODE_PICK_ROM) {
                loadRomUri(uri)
            }
        }
    }

    private fun loadRomUri(uri: Uri) {
        contentResolver.openInputStream(uri)?.use { stream ->
            val bytes = stream.readBytes()
            val ok = nativeLoadExecutable(bytes, bytes.size)
            if (ok) {
                Toast.makeText(this, "Loaded executable successfully!", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, "Error rewriting executable", Toast.LENGTH_LONG).show()
            }
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        mapGamepadButton(keyCode, true)
        return super.onKeyDown(keyCode, event)
    }

    override fun onKeyUp(keyCode: Int, event: KeyEvent?): Boolean {
        mapGamepadButton(keyCode, false)
        return super.onKeyUp(keyCode, event)
    }

    private fun mapGamepadButton(keyCode: Int, pressed: Boolean) {
        val buttonMask = when (keyCode) {
            KeyEvent.KEYCODE_BUTTON_A -> 1 shl 0
            KeyEvent.KEYCODE_BUTTON_B -> 1 shl 1
            KeyEvent.KEYCODE_BUTTON_X -> 1 shl 2
            KeyEvent.KEYCODE_BUTTON_Y -> 1 shl 3
            KeyEvent.KEYCODE_BUTTON_L1 -> 1 shl 6
            KeyEvent.KEYCODE_BUTTON_R1 -> 1 shl 7
            KeyEvent.KEYCODE_BUTTON_L2 -> 1 shl 8
            KeyEvent.KEYCODE_BUTTON_R2 -> 1 shl 9
            KeyEvent.KEYCODE_BUTTON_START -> 1 shl 10
            KeyEvent.KEYCODE_BUTTON_SELECT -> 1 shl 11
            else -> 0
        }
        if (buttonMask != 0) {
            nativeSendButtonEvent(buttonMask, pressed)
        }
    }

    override fun onGenericMotionEvent(event: MotionEvent): Boolean {
        val lx = event.getAxisValue(MotionEvent.AXIS_X)
        val ly = event.getAxisValue(MotionEvent.AXIS_Y)
        nativeSendStickEvent(true, lx, ly)

        val rx = event.getAxisValue(MotionEvent.AXIS_Z)
        val ry = event.getAxisValue(MotionEvent.AXIS_RZ)
        nativeSendStickEvent(false, rx, ry)
        return true
    }
}
