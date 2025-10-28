import { DeviceMotion, DeviceMotionMeasurement } from "expo-sensors";

type RotationHandler = (rotation: Required<DeviceMotionMeasurement["rotation"]>) => void;

let subscription: { remove: () => void } | null = null;
const listeners = new Set<RotationHandler>();

function ensureListener() {
  if (subscription) {
    return;
  }

  DeviceMotion.setUpdateInterval(16);
  subscription = DeviceMotion.addListener((measurement) => {
    const rotation = measurement?.rotation;
    if (!rotation) {
      return;
    }

    const {
      alpha = 0,
      beta = 0,
      gamma = 0,
      timestamp = Date.now(),
    } = rotation;
    listeners.forEach((handler) => {
      handler({ alpha, beta, gamma, timestamp });
    });
  });
}

function teardownListener() {
  if (subscription && listeners.size === 0) {
    subscription.remove();
    subscription = null;
  }
}

export function subscribeToDeviceRotation(handler: RotationHandler) {
  listeners.add(handler);
  ensureListener();

  return () => {
    listeners.delete(handler);
    teardownListener();
  };
}
