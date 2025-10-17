import * as THREE from 'three'

export class NativeRenderer extends THREE.WebGLRenderer {
  constructor(options = {}) {
    super(options)
    this.__nativeGL = options.context
  }

  getContext() {
    // Three's internal context can be a shim without endFrameEXP.
    // Always prefer the captured Expo GL context for presentation.
    return this.__nativeGL || super.getContext?.()
  }

  render(scene, camera) {
    super.render(scene, camera)
    const gl = this.getContext()
    try {
      // Ensure we present the default framebuffer of the native GL layer
      gl.bindFramebuffer?.(gl.FRAMEBUFFER, null)
    } catch (_) {}
    try { gl.flush?.() } catch (_) {}
    try { gl.endFrameEXP?.() } catch (_) {}
  }
}

export const createNativeRenderer = (gl, { width, height }) => {
  // Provide minimal canvas shim for Three
  const canvas = gl.canvas || {}
  canvas.width = gl.drawingBufferWidth || width
  canvas.height = gl.drawingBufferHeight || height
  canvas.clientWidth = canvas.width
  canvas.clientHeight = canvas.height
  canvas.style = canvas.style || {}
  canvas.addEventListener = canvas.addEventListener || (() => {})
  canvas.removeEventListener = canvas.removeEventListener || (() => {})
  canvas.getContext = canvas.getContext || (() => gl)
  gl.canvas = canvas

  const renderer = new NativeRenderer({
    canvas,
    context: gl,
    alpha: false,
    antialias: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
  })
  renderer.setPixelRatio(1)
  renderer.setSize(canvas.width, canvas.height, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.autoClear = true
  return renderer
}
