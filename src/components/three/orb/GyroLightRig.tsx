import React, { useEffect, useRef } from "react";
import { Group } from "three";
import { Gyroscope } from "expo-sensors";

type Props = {
  target?: React.MutableRefObject<Group | null>;
  maxRadians?: number;
};

export function GyroLightRig({ target, maxRadians = 0.35 }: Props) {
  const rot = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const alpha = 0.15;
    Gyroscope.setUpdateInterval(16);

    const sub = Gyroscope.addListener(({ x, y }) => {
      rot.current.x = rot.current.x * (1 - alpha) + x * alpha;
      rot.current.y = rot.current.y * (1 - alpha) + y * alpha;

      const clamp = (v: number) =>
        Math.max(-maxRadians, Math.min(maxRadians, v));

      if (target?.current) {
        target.current.rotation.x = clamp(
          target.current.rotation.x + rot.current.y * 0.02
        );
        target.current.rotation.y = clamp(
          target.current.rotation.y + rot.current.x * 0.02
        );
      }
    });

    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxRadians]);

  return (
    <group>
      <ambientLight intensity={0.25} />
      <hemisphereLight intensity={0.5} />
      <directionalLight position={[3, 2, 2]} intensity={1.0} />
    </group>
  );
}
