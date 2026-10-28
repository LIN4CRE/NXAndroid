package org.nxnative.android

import android.content.Context
import android.net.Uri
import java.io.File

class KeyManager(private val context: Context) {

    private val keysFile: File
        get() = File(context.filesDir, "prod.keys")

    fun hasValidKeys(): Boolean {
        return keysFile.exists() && keysFile.length() > 512
    }

    fun importKeys(uri: Uri): Boolean {
        return try {
            context.contentResolver.openInputStream(uri)?.use { input ->
                keysFile.outputStream().use { output ->
                    input.copyTo(output)
                }
            }
            true
        } catch (e: Exception) {
            false
        }
    }

    fun getKeysPath(): String {
        return keysFile.absolutePath
    }
}
