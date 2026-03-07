import SwiftUI
import UIKit
import Metal
import MetalKit
import CoreMotion

// MARK: - XP Glass Orb (SwiftUI wrapper)

struct XPGlassOrb: UIViewRepresentable {
    let size: CGFloat
    let level: Int
    let progress: Double   // 0.0 – 1.0 fill level
    let tintColor: Color?

    init(size: CGFloat = 60, level: Int = 1, progress: Double = 0, tintColor: Color? = nil) {
        self.size = size
        self.level = level
        self.progress = progress
        self.tintColor = tintColor
    }

    func makeUIView(context: Context) -> MTKView {
        let view = MTKView()
        view.device = MTLCreateSystemDefaultDevice()
        view.backgroundColor = .clear
        view.isOpaque = false
        view.framebufferOnly = false
        view.preferredFramesPerSecond = 60
        view.enableSetNeedsDisplay = false
        view.layer.isOpaque = false
        view.clearColor = MTLClearColor(red: 0, green: 0, blue: 0, alpha: 0)
        if let device = view.device {
            context.coordinator.setup(device: device, view: view)
        }
        context.coordinator.updateParams(progress: Float(progress), tint: tintColor)
        view.delegate = context.coordinator
        return view
    }

    func updateUIView(_ uiView: MTKView, context: Context) {
        context.coordinator.updateParams(progress: Float(progress), tint: tintColor)
    }

    func makeCoordinator() -> XPOrbRenderer { XPOrbRenderer() }
}

// MARK: - Renderer

final class XPOrbRenderer: NSObject, MTKViewDelegate {
    private var device: MTLDevice!
    private var commandQueue: MTLCommandQueue!
    private var pipelineState: MTLRenderPipelineState?
    private var startTime = Date()
    private var fillProgress: Float = 0
    private var tintRGB: SIMD3<Float> = SIMD3(0.3, 0.6, 1.0)
    private let motionManager = CMMotionManager()
    private var tilt = SIMD2<Float>(0, 0)

    override init() {
        super.init()
        if motionManager.isDeviceMotionAvailable {
            motionManager.deviceMotionUpdateInterval = 1.0 / 60
            motionManager.startDeviceMotionUpdates(to: .main) { [weak self] m, _ in
                guard let m else { return }
                self?.tilt = SIMD2<Float>(Float(m.gravity.x) * 0.4, Float(m.gravity.y) * 0.4)
            }
        }
    }

    deinit { motionManager.stopDeviceMotionUpdates() }

    func updateParams(progress: Float, tint: Color?) {
        fillProgress = progress
        if let tint {
            let ui = UIColor(tint)
            var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
            ui.getRed(&r, green: &g, blue: &b, alpha: &a)
            tintRGB = SIMD3<Float>(Float(r), Float(g), Float(b))
        } else {
            tintRGB = SIMD3<Float>(0.28, 0.56, 1.0)
        }
    }

    func setup(device: MTLDevice, view: MTKView) {
        self.device = device
        commandQueue = device.makeCommandQueue()
        buildPipeline(view: view)
    }

    private func buildPipeline(view: MTKView) {
        guard let device else { return }

        let src = """
        #include <metal_stdlib>
        using namespace metal;

        struct VertOut { float4 pos [[position]]; float2 uv; };

        vertex VertOut vert(uint vid [[vertex_id]]) {
            float2 pos[4] = {float2(-1,-1),float2(1,-1),float2(-1,1),float2(1,1)};
            VertOut o; o.pos = float4(pos[vid],0,1); o.uv = pos[vid]; return o;
        }

        float hash(float2 p){ p=fract(p*float2(127.1,311.7)); p+=dot(p,p+19.19); return fract(p.x*p.y); }
        float noise(float2 p){
            float2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);
            return mix(mix(hash(i),hash(i+float2(1,0)),u.x),mix(hash(i+float2(0,1)),hash(i+float2(1,1)),u.x),u.y);
        }
        float fbm(float2 p, int oct){
            float v=0.,a=0.5;
            for(int i=0;i<oct;i++){v+=a*noise(p);p*=2.1;a*=0.5;}
            return v;
        }

        struct Uniforms { float time; float progress; float2 tilt; float3 tint; };

        fragment float4 frag(VertOut in [[stage_in]],
                             constant Uniforms &u [[buffer(0)]]) {
            float2 uv = in.uv;
            float r = length(uv);
            if(r > 1.0) return float4(0);

            float z = sqrt(max(0.0, 1.0 - r*r));
            float3 norm = normalize(float3(uv, z));

            // Tilt-shifted fill level — liquid inside sphere
            float tiltedY = uv.y + u.tilt.y * 0.35 + u.tilt.x * 0.1;
            // fill threshold: maps progress 0→1 to sphere interior top→bottom
            float fillLine = mix(1.2, -1.2, u.progress);
            // liquid surface edge
            float liquidEdge = smoothstep(fillLine + 0.08, fillLine - 0.08, tiltedY);

            // Liquid color (tint with subtle FBM ripple)
            float2 sp = norm.xy + u.tilt * 0.15;
            float ripple = fbm(sp * 3.0 + float2(u.time * 0.2, u.time * 0.15), 3) * 0.12;
            float3 liquidCol = u.tint * (0.7 + ripple);
            // Darken at the bottom, lighter toward fill line
            float depthFade = smoothstep(fillLine + 0.6, fillLine, tiltedY);
            liquidCol *= (0.6 + 0.4 * depthFade);
            // Subtle subsurface glow near the surface
            float surfaceGlow = smoothstep(fillLine + 0.15, fillLine, tiltedY) * 0.25;
            liquidCol += u.tint * surfaceGlow;

            // === GLASS SHELL ===
            float fresnel = pow(1.0 - z, 1.9) * 0.9;
            float rimWeight = smoothstep(0.55, 1.0, r);
            float3 glassCol = float3(0.92, 0.94, 1.0);
            float glassSurface = noise(norm.xy * 9.0 + u.time * 0.25) * 0.03;
            glassCol += glassSurface;
            float glassAlpha = clamp(fresnel * 0.65 + rimWeight * 0.22, 0.0, 0.78);

            // Specular — tiny tight highlight
            float3 L = normalize(float3(0.4 + u.tilt.x*0.5, 0.55 + u.tilt.y*0.5, 1.0));
            float3 H = normalize(L + float3(0,0,1));
            float spec = pow(max(0.0, dot(norm, H)), 160.0) * 0.3;

            // === COMPOSITE ===
            // Start: glass interior is clear above liquid, liquid below
            float3 outCol = liquidCol * liquidEdge;
            float outA = liquidEdge * 0.92;

            // Glass rim
            outCol = outCol * (1.0 - glassAlpha) + glassCol * glassAlpha;
            outA = clamp(outA * (1.0 - glassAlpha) + glassAlpha, 0.0, 1.0);

            // Spec
            outCol += spec;
            outA = clamp(outA + spec * 0.4, 0.0, 1.0);

            float edgeAlpha = smoothstep(1.0, 0.95, r);
            outA *= edgeAlpha;
            outCol *= edgeAlpha;

            return float4(outCol, outA);
        }
        """

        guard let lib = try? device.makeLibrary(source: src, options: nil),
              let vertFn = lib.makeFunction(name: "vert"),
              let fragFn = lib.makeFunction(name: "frag") else {
            print("[XPOrb] Shader compile failed")
            return
        }

        let desc = MTLRenderPipelineDescriptor()
        desc.vertexFunction = vertFn
        desc.fragmentFunction = fragFn
        desc.colorAttachments[0].pixelFormat = view.colorPixelFormat
        desc.colorAttachments[0].isBlendingEnabled = true
        desc.colorAttachments[0].sourceRGBBlendFactor = .one
        desc.colorAttachments[0].destinationRGBBlendFactor = .oneMinusSourceAlpha
        desc.colorAttachments[0].sourceAlphaBlendFactor = .one
        desc.colorAttachments[0].destinationAlphaBlendFactor = .oneMinusSourceAlpha
        pipelineState = try? device.makeRenderPipelineState(descriptor: desc)
    }

    func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {}

    func draw(in view: MTKView) {
        guard let pipeline = pipelineState,
              let descriptor = view.currentRenderPassDescriptor,
              let drawable = view.currentDrawable,
              let buffer = commandQueue.makeCommandBuffer() else { return }

        descriptor.colorAttachments[0].loadAction = .clear
        descriptor.colorAttachments[0].clearColor = MTLClearColor(red: 0, green: 0, blue: 0, alpha: 0)
        guard let encoder = buffer.makeRenderCommandEncoder(descriptor: descriptor) else { return }

        struct Uniforms { var time: Float; var progress: Float; var tilt: SIMD2<Float>; var tint: SIMD3<Float> }
        var uniforms = Uniforms(
            time: Float(Date().timeIntervalSince(startTime)),
            progress: fillProgress,
            tilt: tilt,
            tint: tintRGB
        )

        encoder.setRenderPipelineState(pipeline)
        encoder.setFragmentBytes(&uniforms, length: MemoryLayout<Uniforms>.size, index: 0)
        encoder.drawPrimitives(type: .triangleStrip, vertexStart: 0, vertexCount: 4)
        encoder.endEncoding()
        buffer.present(drawable)
        buffer.commit()
    }
}
