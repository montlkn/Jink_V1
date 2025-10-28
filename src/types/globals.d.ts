declare const __DEV__: boolean;
declare const global: any;

declare module "*.svg";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
