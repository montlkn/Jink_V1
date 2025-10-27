import { registerRootComponent } from "expo";
import App from "./App";

const scope = (typeof globalThis !== "undefined" && globalThis)
  || (typeof global !== "undefined" && global)
  || (typeof self !== "undefined" && self);

if (scope) {
  if (!scope.document) {
    scope.document = {};
  }

  const doc = scope.document;

  if (typeof doc.getElementsByTagName !== "function") {
    doc.getElementsByTagName = () => [];
  }

  if (typeof doc.createElement !== "function") {
    doc.createElement = () => ({
      style: {},
      addEventListener: () => {},
      removeEventListener: () => {},
    });
  }

  if (typeof doc.createElementNS !== "function") {
    doc.createElementNS = () => ({
      style: {},
      addEventListener: () => {},
      removeEventListener: () => {},
    });
  }

  if (typeof doc.contains !== "function") {
    doc.contains = () => false;
  }

  if (!doc.body) {
    doc.body = {};
  }

  if (typeof doc.body.appendChild !== "function") {
    doc.body.appendChild = () => {};
  }

  if (typeof doc.body.removeChild !== "function") {
    doc.body.removeChild = () => {};
  }

  if (typeof doc.body.contains !== "function") {
    doc.body.contains = () => false;
  }
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
