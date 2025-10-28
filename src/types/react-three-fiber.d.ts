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
      primitive: any;
      planeGeometry: any;
      shaderMaterial: any;
    }
  }
}

declare module '@react-three/fiber/native' {
  import * as React from 'react';
  import type { Loader } from 'three';

  export const Canvas: React.ComponentType<any>;

  export function useThree<T = {
    gl: any;
    scene: any;
    camera: any;
    [key: string]: any;
  }>(selector?: (state: {
    gl: any;
    scene: any;
    camera: any;
    [key: string]: any;
  }) => T): T;

  export function useFrame(callback: (state: any, delta: number) => void, priority?: number): void;

  export function extend(objects: Record<string, unknown>): void;

  export function useLoader<T = any>(
    loader: { new (...args: any[]): Loader },
    input: string | string[],
    extensions?: (loader: Loader) => void
  ): T;

  export namespace ReactThreeFiber {
    type Object3DNode<T = unknown, U = unknown> = Record<string, unknown> & {
      __component__?: T;
      __instance__?: U;
    };
  }
}

export {};
