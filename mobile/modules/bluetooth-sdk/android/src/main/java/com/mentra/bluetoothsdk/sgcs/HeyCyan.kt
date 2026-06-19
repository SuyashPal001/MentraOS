package com.mentra.bluetoothsdk.sgcs

import android.util.Log
import com.mentra.bluetoothsdk.Bridge
import com.mentra.bluetoothsdk.PhotoRequest
import com.mentra.bluetoothsdk.DeviceStore
import java.util.UUID

/**
 * Smart Glasses Communicator for HeyCyan glasses.
 * Reverse engineered from community SDK.
 */
class HeyCyan : SGCManager() {

    companion object {
        private const val TAG = "HeyCyan"

        // BLE UUIDs from SDK Docs
        private val SERVICE_UUID: UUID = UUID.fromString("7905FFF0-B5CE-4E99-A40F-4B1E122D00D0")
    }

    init {
        type = "HeyCyan"
        hasMic = true
    }

    override fun setMicEnabled(enabled: Boolean) {
        Bridge.log("$TAG: setMicEnabled $enabled")
    }

    override fun sortMicRanking(list: MutableList<String>): MutableList<String> {
        return list
    }

    override fun requestPhoto(request: PhotoRequest) {
        Bridge.log("$TAG: requestPhoto called")
    }

    override fun startStream(message: MutableMap<String, Any>) {
        Bridge.log("$TAG: startStream not supported")
    }

    override fun stopStream() {
        Bridge.log("$TAG: stopStream not supported")
    }

    override fun sendStreamKeepAlive(message: MutableMap<String, Any>) {
        Bridge.log("$TAG: sendStreamKeepAlive not supported")
    }

    override fun startVideoRecording(requestId: String, save: Boolean, sound: Boolean) {
        Bridge.log("$TAG: startVideoRecording called")
    }

    override fun stopVideoRecording(requestId: String) {
        Bridge.log("$TAG: stopVideoRecording called")
    }

    override fun sendButtonPhotoSettings() {}

    override fun sendButtonVideoRecordingSettings() {}

    override fun sendButtonMaxRecordingTime() {}

    override fun sendCameraFovSetting() {}

    override fun setBrightness(level: Int, autoMode: Boolean) {}

    override fun clearDisplay() {}

    override fun sendText(text: String) {
        Bridge.log("$TAG: sendText $text")
    }

    override fun sendTextWall(text: String) {
        Bridge.log("$TAG: sendTextWall $text")
    }

    override fun sendDoubleTextWall(top: String, bottom: String) {}

    override fun displayBitmap(base64ImageData: String, x: Int?, y: Int?, width: Int?, height: Int?): Boolean {
        return false
    }

    override fun showDashboard() {}

    override fun setDashboardPosition(height: Int, depth: Int) {}

    override fun setHeadUpAngle(angle: Int) {}

    override fun getBatteryStatus() {
        Bridge.log("$TAG: getBatteryStatus called")
    }

    override fun setSilentMode(enabled: Boolean) {}

    override fun exit() {}

    override fun sendShutdown() {}

    override fun sendReboot() {}

    override fun sendRgbLedControl(requestId: String, packageName: String?, action: String, color: String?, onDurationMs: Int, offDurationMs: Int, count: Int) {}

    override fun disconnect() {
        Bridge.log("$TAG: disconnect called")
    }

    override fun forget() {}

    override fun findCompatibleDevices() {}

    override fun stopScan() {}

    override fun connectById(id: String) {
        Bridge.log("$TAG: connectById $id")
    }

    override fun getConnectedBluetoothName(): String {
        return "HeyCyan"
    }

    override fun cleanup() {}

    override fun ping() {}

    override fun dbg1() {}

    override fun dbg2() {}

    override fun requestWifiScan() {}

    override fun sendWifiCredentials(ssid: String, password: String) {}

    override fun forgetWifiNetwork(ssid: String) {}

    override fun sendHotspotState(enabled: Boolean) {}

    override fun sendUserEmailToGlasses(email: String) {}

    override fun sendIncidentId(incidentId: String, apiBaseUrl: String?) {}

    override fun queryGalleryStatus() {}

    override fun sendGalleryMode() {}

    override fun requestVersionInfo() {}
}
