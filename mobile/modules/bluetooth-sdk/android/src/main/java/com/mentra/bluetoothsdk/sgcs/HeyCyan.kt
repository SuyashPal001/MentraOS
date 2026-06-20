package com.mentra.bluetoothsdk.sgcs

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.mentra.bluetoothsdk.Bridge
import com.mentra.bluetoothsdk.DeviceStore
import com.mentra.bluetoothsdk.PhotoRequest
import com.mentra.bluetoothsdk.utils.DeviceTypes
import java.util.UUID

/**
 * Smart Glasses Communicator for HeyCyan glasses.
 * Reverse engineered from community SDK.
 */
class HeyCyan : SGCManager() {

    companion object {
        private const val TAG = "HeyCyan"

        // BLE UUIDs extracted from vendor glasses_sdk AAR (com.oudmon.ble.base.communication.Constants)
        private val SERVICE_UUID: UUID = UUID.fromString("6e40fff0-b5a3-f393-e0a9-e50e24dcca9e")
        private val WRITE_CHAR_UUID: UUID = UUID.fromString("6e400002-b5a3-f393-e0a9-e50e24dcca9e")
        private val NOTIFY_CHAR_UUID: UUID = UUID.fromString("6e400003-b5a3-f393-e0a9-e50e24dcca9e")
        private val CCCD_UUID: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")
    }

    private var bluetoothAdapter: BluetoothAdapter = BluetoothAdapter.getDefaultAdapter()
    private var isScanningForCompatibleDevices: Boolean = false
    private var bleScanCallback: ScanCallback? = null
    private var findCompatibleDevicesHandler: Handler? = null

    private var mainDevice: BluetoothDevice? = null
    private var mainGlassGatt: BluetoothGatt? = null
    private var mainWriteChar: BluetoothGattCharacteristic? = null
    private var mainNotifyChar: BluetoothGattCharacteristic? = null

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
        cleanup()
    }

    override fun forget() {
        Bridge.log("$TAG: forget called")
        DeviceStore.apply("glasses", "fullyBooted", false)
        cleanup()
    }

    override fun findCompatibleDevices() {
        if (isScanningForCompatibleDevices) {
            Bridge.log("$TAG: Scan already in progress, skipping...")
            return
        }

        isScanningForCompatibleDevices = true
        val scanner = bluetoothAdapter.bluetoothLeScanner ?: run {
            Log.e(TAG, "BluetoothLeScanner not available")
            isScanningForCompatibleDevices = false
            return
        }

        val foundDeviceNames = mutableListOf<String>()
        if (findCompatibleDevicesHandler == null) {
            findCompatibleDevicesHandler = Handler(Looper.getMainLooper())
        }

        val filters = mutableListOf<ScanFilter>()
        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_BALANCED)
            .build()

        bleScanCallback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                val device = result.device
                val name = device.name ?: ""
                val address = device.address

                val hasHeyCyanService = result.scanRecord?.serviceUuids?.contains(android.os.ParcelUuid(SERVICE_UUID)) == true

                if (name.contains("HeyCyan", ignoreCase = true) || name.startsWith("O_") || name.startsWith("Q_") || hasHeyCyanService) {
                    Bridge.log("$TAG bleScanCallback onScanResult: $name address $address")
                    synchronized(foundDeviceNames) {
                        if (!foundDeviceNames.contains(address)) {
                            foundDeviceNames.add(address)
                            Bridge.log("$TAG Found smart glasses: $name ($address)")
                            Bridge.sendDiscoveredDevice(DeviceTypes.HEYCYAN, address)
                        }
                    }
                }
            }

            override fun onScanFailed(errorCode: Int) {
                Log.e(TAG, "BLE scan failed with code: $errorCode")
            }
        }

        scanner.startScan(filters, settings, bleScanCallback)
        Bridge.log("$TAG Started scanning for smart glasses...")

        findCompatibleDevicesHandler?.postDelayed({
            stopScan()
        }, 10000)
    }

    override fun stopScan() {
        if (isScanningForCompatibleDevices) {
            val scanner = bluetoothAdapter.bluetoothLeScanner
            bleScanCallback?.let { scanner?.stopScan(it) }
            isScanningForCompatibleDevices = false
            bleScanCallback = null
            Bridge.log("$TAG Stopped scanning for smart glasses.")
        }
    }

    override fun connectById(id: String) {
        Bridge.log("$TAG: connectById $id")
        
        mainDevice = bluetoothAdapter.getRemoteDevice(id)
        if (mainDevice == null) {
            Log.e(TAG, "Device not found for MAC address: $id")
            return
        }

        Bridge.log("$TAG: Connecting to device ${mainDevice?.name} ($id)")
        
        mainGlassGatt = mainDevice?.connectGatt(Bridge.getContext(), false, object : BluetoothGattCallback() {
            override fun onConnectionStateChange(gatt: BluetoothGatt?, status: Int, newState: Int) {
                if (newState == BluetoothProfile.STATE_CONNECTED) {
                    Bridge.log("$TAG: Connected to GATT server. Discovering services...")
                    gatt?.discoverServices()
                } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                    Bridge.log("$TAG: Disconnected from GATT server.")
                    DeviceStore.apply("glasses", "connected", false)
                    DeviceStore.apply("glasses", "fullyBooted", false)
                }
            }

            override fun onServicesDiscovered(gatt: BluetoothGatt?, status: Int) {
                if (status == BluetoothGatt.GATT_SUCCESS) {
                    Bridge.log("$TAG: Services discovered.")
                    val service = gatt?.getService(SERVICE_UUID)
                    if (service != null) {
                        mainWriteChar = service.getCharacteristic(WRITE_CHAR_UUID)
                        mainNotifyChar = service.getCharacteristic(NOTIFY_CHAR_UUID)

                        if (mainWriteChar != null && mainNotifyChar != null) {
                            // Enable BLE notifications on the notify characteristic
                            gatt.setCharacteristicNotification(mainNotifyChar, true)
                            val descriptor = mainNotifyChar!!.getDescriptor(CCCD_UUID)
                            if (descriptor != null) {
                                descriptor.value = android.bluetooth.BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                                gatt.writeDescriptor(descriptor)
                            }

                            Bridge.log("$TAG: HeyCyan connected and ready. Handing off to MentraOS.")
                            DeviceStore.apply("glasses", "connected", true)
                            DeviceStore.apply("glasses", "fullyBooted", true)
                        } else {
                            Log.e(TAG, "HeyCyan write=${mainWriteChar != null} notify=${mainNotifyChar != null} — characteristic missing")
                        }
                    } else {
                        Bridge.log("$TAG: HeyCyan main service not found. Services found: ${gatt?.services?.map { it.uuid }}")
                    }
                } else {
                    Log.w(TAG, "onServicesDiscovered status: $status")
                }
            }

            override fun onCharacteristicChanged(gatt: BluetoothGatt?, characteristic: BluetoothGattCharacteristic?) {
                val data = characteristic?.value ?: return
                Bridge.log("$TAG: notify data: ${data.joinToString("") { "%02x".format(it) }}")
            }
        })
    }

    override fun getConnectedBluetoothName(): String {
        return mainDevice?.name ?: "HeyCyan"
    }

    override fun cleanup() {
        Bridge.log("$TAG: cleanup called")
        stopScan()
        mainGlassGatt?.disconnect()
        mainGlassGatt?.close()
        mainGlassGatt = null
        mainDevice = null
        mainWriteChar = null
        mainNotifyChar = null
    }

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
