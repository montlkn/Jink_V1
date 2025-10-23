import React, { useEffect, useRef } from "react";
import { Euler, Group } from "three";
import { subscribeToDeviceRotation } from "./gyroController";

type Props = {
  target?: React.MutableRefObject<Group | null>;
  maxRadians?: number;
};

export function GyroLightRig({ target, maxRadians = 0.35 }: Props) {
  const rotationEuler = useRef(new Euler());

  useEffect(() => {
    if (!target) {
      return;
    }

    const clamp = (value: number) =>
      Math.max(-maxRadians, Math.min(maxRadians, value));

    const unsubscribe = subscribeToDeviceRotation(({ alpha, beta, gamma }) => {
      if (!target.current) {
        return;
      }

      rotationEuler.current.set(clamp(beta), clamp(alpha), clamp(-gamma));
      target.current.rotation.copy(rotationEuler.current);
    });

    return unsubscribe;
  }, [target, maxRadians]);

  return null;
}
