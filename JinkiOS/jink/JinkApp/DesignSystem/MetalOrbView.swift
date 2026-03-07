import SwiftUI
import UIKit
import Metal
import MetalKit
import CoreMotion

// MARK: - Metal Orb View (SwiftUI wrapper)

struct MetalOrbView: UIViewRepresentable {
    let colors: [Color]
    let dominantColor: Color
    let size: CGFloat

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
            context.coordinator.setup(device: device, view: view, colors: colors)
        }
        view.delegate = context.coordinator
        return view
    }

    func updateUIView(_ uiView: MTKView, context: Context) {
        context.coordinator.updateColors(colors)
    }

    func makeCoordinator() -> OrbRenderer {
        OrbRenderer(size: size)
    }
}

// MARK: - Renderer

final class OrbRenderer: NSObject, MTKViewDelegate {
    private var device: MTLDevice!
    private var commandQueue: MTLCommandQueue!
    private var pipelineState: MTLRenderPipelineState?
    private var startTime: Date = Date()
    private var orbColors: [SIMD4<Float>] = []
    private let motionManager = CMMotionManager()
    private var tilt = SIMD2<Float>(0, 0)
    let size: CGFloat

    init(size: CGFloat) {
        self.size = size
        super.init()
        startMotion()
    }

    deinit { motionManager.stopDeviceMotionUpdates() }

    private func startMotion() {
        guard motionManager.isDeviceMotionAvailable else { return }
        motionManager.deviceMotionUpdateInterval = 1.0 / 60.0
        motionManager.startDeviceMotionUpdates(to: .main) { [weak self] motion, _ in
            guard let m = motion else { return }
            self?.tilt = SIMD2<Float>(
                Float(m.gravity.x) * 0.6,
                Float(m.gravity.y) * 0.6
            )
        }
    }

    func setup(device: MTLDevice, view: MTKView, colors: [Color]) {
        self.device = device
        self.commandQueue = device.makeCommandQueue()
        self.orbColors = colors.prefix(3).map { $0.toSIMD() }
        while self.orbColors.count < 3 {
            self.orbColors.append(SIMD4<Float>(0.2, 0.5, 0.9, 1))
        }
        buildPipeline(view: view)
    }

    func updateColors(_ colors: [Color]) {
        orbColors = colors.prefix(3).map { $0.toSIMD() }
        while orbColors.count < 3 { orbColors.append(SIMD4<Float>(0.2, 0.5, 0.9, 1)) }
    }

    private func buildPipeline(view: MTKView) {
        guard let device = device else { return }

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
            return mix(mix(hash(i),hash(i+float2(1,0)),u.x),
                       mix(hash(i+float2(0,1)),hash(i+float2(1,1)),u.x),u.y);
        }
        float fbm(float2 p, int oct){
            float v=0.,a=0.5;
            for(int i=0;i<oct;i++){v+=a*noise(p);p*=2.1;a*=0.5;}
            return v;
        }

        struct Uniforms { float time; float2 tilt; };

        fragment float4 frag(VertOut in [[stage_in]],
                             constant Uniforms &u [[buffer(0)]],
                             constant float4  *col[[buffer(1)]]) {
            float2 uv = in.uv;
            float  r  = length(uv);
            if(r > 1.0) return float4(0);

            float  z    = sqrt(max(0.0, 1.0 - r*r));
            float3 norm = normalize(float3(uv, z));

            // Gyro-shifted light
            float3 L = normalize(float3(0.45 + u.tilt.x*0.5, 0.6 + u.tilt.y*0.5, 1.0));

            // === LAYER 1: SMOKE WISPS (inner, behind glass) ===
            // Slow rotation of the smoke field
            float ang = u.time * 0.12;
            float2x2 rot = float2x2(cos(ang),-sin(ang),sin(ang),cos(ang));
            float2 sp = rot * (norm.xy * 0.6 + float2(norm.z * 0.25));

            // Gyro-reactive smoke sloshing — tilt offsets smoke sampling position
            sp += u.tilt * 0.2;

            // IOR distortion — simulate thick glass lens bending the smoke view
            float ior_distort = 0.06;
            sp += norm.xy * ior_distort;

            // Warped FBM smoke — same cascade that looked good
            float2 q  = float2(fbm(sp*2.2 + float2(0.0,  u.time*0.10), 4),
                               fbm(sp*2.2 + float2(5.2,  u.time*0.08), 4));
            float2 rv = float2(fbm(sp*1.9 + 4.0*q + float2(1.7, u.time*0.13), 5),
                               fbm(sp*1.9 + 4.0*q + float2(9.2, u.time*0.09), 5));
            float rawSmoke = fbm(sp*1.4 + 3.0*rv + u.time*0.04, 6);

            // Density with edge fade — smoke extends to ~95% of radius
            float edgeFade = 1.0 - smoothstep(0.7, 0.97, r);
            float density  = clamp((rawSmoke - 0.1) / 0.75, 0.0, 1.0);
            density = pow(density, 0.5);
            float smokeAlpha = density * edgeFade * 1.3;
            smokeAlpha = clamp(smokeAlpha, 0.0, 1.0);

            // Three-color blend by density (matches RN shader)
            float3 c0=col[0].rgb, c1=col[1].rgb, c2=col[2].rgb;
            float3 smokeCol;
            if(density < 0.33) {
                smokeCol = mix(c0, c1, density / 0.33);
            } else if(density < 0.66) {
                smokeCol = mix(c1, c2, (density - 0.33) / 0.33);
            } else {
                smokeCol = mix(c2, c0, (density - 0.66) / 0.34);
            }
            // Heavily desaturate toward gray-toned smoke — organic not neon
            float luma = dot(smokeCol, float3(0.299, 0.587, 0.114));
            smokeCol = mix(float3(luma), smokeCol, 0.45); // 55% desaturated
            smokeCol = smokeCol * 0.75 + 0.08;             // darken + lift blacks slightly

            // Soft diffuse light — no harsh directional bounce, just ambient
            float diff = 0.75 + 0.25 * max(0.0, dot(norm, L));
            smokeCol *= diff;

            // Very subtle depth pulse — keeps it alive without neon glow
            float pulse = 0.5 + 0.5*sin(u.time*1.1 + rawSmoke*3.0);
            smokeCol += float3(luma) * density * 0.05 * pulse;

            // === LAYER 2: GLASS SHELL (on top, transparent with Fresnel) ===
            // Steeper Fresnel for thicker glass rim feel
            float fresnel = pow(1.0 - z, 1.8) * 0.95;
            float rimWeight = smoothstep(0.6, 1.0, r); // stronger toward edge

            // Glass rim: cool clear white, thicker toward edge
            float3 glassCol = float3(0.93, 0.95, 1.0);
            float glassSurface = noise(norm.xy * 8.0 + u.time * 0.3) * 0.03;
            glassCol += glassSurface;
            float glassAlpha = (fresnel * 0.6 + rimWeight * 0.25);
            glassAlpha = clamp(glassAlpha, 0.0, 0.8);

            // Specular: much softer, small highlight only — no harsh blob
            float3 H    = normalize(L + float3(0,0,1));
            float  spec = pow(max(0.0, dot(norm, H)), 140.0); // very tight
            float3 specCol = float3(1.0) * spec * 0.35;       // dim
            float  specA   = spec * 0.3;

            // === COMPOSITE: smoke behind, glass on top ===
            float3 outCol = smokeCol * smokeAlpha;
            float  outA   = smokeAlpha;

            // Layer glass rim over
            outCol = outCol * (1.0 - glassAlpha) + glassCol * glassAlpha;
            outA   = clamp(outA * (1.0 - glassAlpha) + glassAlpha, 0.0, 1.0);

            // Add soft specular highlight
            outCol += specCol;
            outA    = clamp(outA + specA, 0.0, 1.0);

            // Soft outer edge
            float edgeAlpha = smoothstep(1.0, 0.95, r);
            outA   *= edgeAlpha;
            outCol *= edgeAlpha;

            return float4(outCol, outA);
        }
        """

        guard let lib = try? device.makeLibrary(source: src, options: nil),
              let vertFn = lib.makeFunction(name: "vert"),
              let fragFn = lib.makeFunction(name: "frag") else {
            print("[MetalOrb] Shader compile failed")
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

        // Transparent clear — must be set on descriptor directly
        descriptor.colorAttachments[0].loadAction = .clear
        descriptor.colorAttachments[0].clearColor = MTLClearColor(red: 0, green: 0, blue: 0, alpha: 0)

        guard let encoder = buffer.makeRenderCommandEncoder(descriptor: descriptor) else { return }

        struct Uniforms { var time: Float; var tilt: SIMD2<Float> }
        var uniforms = Uniforms(
            time: Float(Date().timeIntervalSince(startTime)),
            tilt: tilt
        )

        encoder.setRenderPipelineState(pipeline)
        encoder.setFragmentBytes(&uniforms, length: MemoryLayout<Uniforms>.size, index: 0)
        encoder.setFragmentBytes(&orbColors, length: MemoryLayout<SIMD4<Float>>.size * 3, index: 1)
        encoder.drawPrimitives(type: .triangleStrip, vertexStart: 0, vertexCount: 4)
        encoder.endEncoding()

        buffer.present(drawable)
        buffer.commit()
    }
}

// MARK: - Color helper

private extension Color {
    func toSIMD() -> SIMD4<Float> {
        let ui = UIColor(self)
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        ui.getRed(&r, green: &g, blue: &b, alpha: &a)
        return SIMD4<Float>(Float(r), Float(g), Float(b), Float(a))
    }
}
