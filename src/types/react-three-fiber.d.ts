import * as React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      sphereGeometry: any;
      meshPhysicalMaterial: any;
      ambientLight: any;
      hemisphereLight: any;
      directionalLight: any;
    }
  }
}

declare module '@react-three/fiber/native' {
  import * as React from 'react';

  export const Canvas: React.ComponentType<any>;

  export function useThree(): {
    gl: any;
    scene: any;
    camera: any;
    [key: string]: any;
  };

  export function useFrame(callback: (state: any, delta: number) => void, priority?: number): void;
}
