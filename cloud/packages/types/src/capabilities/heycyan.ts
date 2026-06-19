import type { Capabilities } from "../hardware";
import { DeviceTypes } from "../enums";

export const heycyan: Capabilities = {
  modelName: DeviceTypes.HEYCYAN,

  hasCamera: false,
  camera: null,

  hasDisplay: true,
  display: {
    count: 1,
    isColor: false,
    color: "green",
    canDisplayBitmap: false,
    resolution: { width: 640, height: 480 },
    fieldOfView: { horizontal: 30 },
    maxTextLines: 7,
    adjustBrightness: true,
  },

  hasMicrophone: true,
  microphone: {
    count: 1,
    hasVAD: false,
  },

  hasSpeaker: true,
  speaker: {
    count: 1,
    isPrivate: false,
  },

  hasIMU: false,
  imu: null,

  hasButton: false,
  button: null,

  hasLight: false,
  light: null,

  power: {
    hasExternalBattery: false,
  },

  hasWifi: false,
  hasOta: false,
};
