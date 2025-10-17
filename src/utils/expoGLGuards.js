// Patches Expo GL WebGL contexts to safely ignore unsupported pixelStorei enums
// This runs before Three initializes, preventing EXGL warnings on native.

/* eslint-disable no-param-reassign */

const UNSUPPORTED_PIXEL_STORE_ENUMS = new Set([
  37440, // UNPACK_FLIP_Y_WEBGL
  37441, // UNPACK_PREMULTIPLY_ALPHA_WEBGL
  37442, // UNPACK_COLORSPACE_CONVERSION_WEBGL (alias)
  37443, // UNPACK_COLORSPACE_CONVERSION_WEBGL
  37444, // BROWSER_DEFAULT_WEBGL
]);

const patchPixelStore = (gl, verbose) => {
  if (!gl || typeof gl !== 'object') return;
  if (gl.__pixelStoreGuardApplied) return;

  const original = typeof gl.pixelStorei === 'function' ? gl.pixelStorei.bind(gl) : null;
  const warned = new Set();
  const wrappedPixelStore = (pname, param) => {
    if (UNSUPPORTED_PIXEL_STORE_ENUMS.has(pname)) {
      if (verbose && !warned.has(pname)) {
        warned.add(pname);
        console.warn(
          `[ExpoGLGuard] Suppressing pixelStorei(${pname}, ${String(
            param
          )}) to avoid EXGL unsupported parameter error.`
        );
      }
      return undefined;
    }

    if (!original) return undefined;

    if (verbose && typeof console !== 'undefined') {
      const label =
        (() => {
          try {
            return Object.keys(gl).find((key) => gl[key] === pname) || null;
          } catch (_) {
            return null;
          }
        })() || String(pname);
      if (!warned.has(label)) {
        warned.add(label);
        console.log(`[ExpoGLGuard] pixelStorei passthrough ${label} -> ${String(param)}`);
      }
    }
    try {
      return original(pname, param);
    } catch (error) {
      if (verbose && !UNSUPPORTED_PIXEL_STORE_ENUMS.has(pname)) {
        console.warn(`[ExpoGLGuard] pixelStorei(${pname}) threw: ${error?.message}`);
      }
      return undefined;
    }
  };

  try {
    if (typeof gl.pixelStorei === 'function') {
      gl.pixelStorei = wrappedPixelStore;
    }
    const proto = Object.getPrototypeOf(gl);
    if (proto && typeof proto.pixelStorei === 'function') {
      const protoOriginal = proto.pixelStorei.bind(gl);
      proto.pixelStorei = (pname, param) => {
        if (UNSUPPORTED_PIXEL_STORE_ENUMS.has(pname)) {
          if (verbose && !warned.has(pname)) {
            warned.add(pname);
            console.warn(
              `[ExpoGLGuard] Suppressing proto pixelStorei(${pname}, ${String(
                param
              )}) to avoid EXGL unsupported parameter error.`
            );
          }
          return undefined;
        }
        try {
          return protoOriginal(pname, param);
        } catch (error) {
          if (verbose) {
            console.warn(`[ExpoGLGuard] proto pixelStorei(${pname}) threw: ${error?.message}`);
          }
          return undefined;
        }
      };
    }
  } catch (_) {
    // Ignore host object mutations that fail
  }

  gl.__pixelStoreGuardApplied = true;
};

const proxifyEXGLContexts = (verbose) => {
  if (typeof global === 'undefined') return;

  const handler = {
    set(target, key, value) {
      if (value && typeof value === 'object') {
        patchPixelStore(value, verbose);
      }
      target[key] = value;
      return true;
    },
    deleteProperty(target, key) {
      return delete target[key];
    },
  };

  let store = (global.__EXGLContexts && global.__EXGLContexts.__store) || global.__EXGLContexts || {};
  if (typeof store !== 'object' || store === null) {
    store = {};
  }

  Object.values(store).forEach((context) => patchPixelStore(context, verbose));

  let proxy = new Proxy(store, handler);
  proxy.__store = store;

  Object.defineProperty(global, '__EXGLContexts', {
    configurable: true,
    enumerable: false,
    get() {
      return proxy;
    },
    set(next) {
      store = (next && next.__store) || next || {};
      if (typeof store !== 'object' || store === null) {
        store = {};
      }
      Object.values(store).forEach((context) => patchPixelStore(context, verbose));
      proxy = new Proxy(store, handler);
      proxy.__store = store;
    },
  });
};

export const installExpoGLGuards = ({ verbose = false } = {}) => {
  if (global.__expoGLGuardsInstalled) return;

  proxifyEXGLContexts(verbose);

  const candidates = [global.WebGL2RenderingContext, global.WebGLRenderingContext].filter(Boolean);
  candidates.forEach((Ctor) => {
    const proto = Ctor && Ctor.prototype;
    if (!proto || typeof proto.pixelStorei !== 'function') return;
    if (proto.__patchedPixelStorei) return;

    const warned = new Set();
    const protoOriginal = proto.pixelStorei.bind(proto);
    proto.pixelStorei = function patchedPixelStorei(pname, param) {
      if (UNSUPPORTED_PIXEL_STORE_ENUMS.has(pname)) {
        if (verbose && !warned.has(pname)) {
          warned.add(pname);
          console.warn(
            `[ExpoGLGuard] Suppressing prototype pixelStorei(${pname}, ${String(
              param
            )}) to avoid EXGL unsupported parameter error.`
          );
        }
        return undefined;
      }
      try {
        return protoOriginal.call(this, pname, param);
      } catch (error) {
        if (verbose) {
          console.warn(`[ExpoGLGuard] prototype pixelStorei(${pname}) threw: ${error?.message}`);
        }
        return undefined;
      }
    };
    proto.__patchedPixelStorei = true;
  });

  global.__expoGLGuardsInstalled = true;
};
