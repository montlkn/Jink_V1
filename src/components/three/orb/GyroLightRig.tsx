import React, { useEffect } from "react";
import { Group } from "three";
import { DeviceMotion } from "expo-sensors";

type Props = {
  target?: React.MutableRefObject<Group | null>;
  maxRadians?: number;
};

export function GyroLightRig({ target, maxRadians = 0.35 }: Props) {
  useEffect(() => {
    DeviceMotion.setUpdateInterval(16);
    const sub = DeviceMotion.addListener(({ rotation }) => {
      if (!rotation || !target?.current) {
        return;
      }

      const { alpha = 0, beta = 0, gamma = 0 } = rotation;
      const clamp = (value: number) =>
        Math.max(-maxRadians, Math.min(maxRadians, value));

      target.current.rotation.set(
        clamp(beta),
        clamp(alpha),
        clamp(-gamma)
      );
    });

    return () => {
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxRadians]);

  return null;
}
