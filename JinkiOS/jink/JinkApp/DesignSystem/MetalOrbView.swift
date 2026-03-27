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
        // Let SwiftUI handle touches (fixes squish tap animation)
        view.isUserInteractionEnabled = false

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
    // Shared across ALL orb instances so smoke state is identical on every screen
    private static let sharedStartTime: Date = Date()
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
        motionManager.startDeviceMotionUpdates()
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

            // === LAYER 1: WISPY SMOKE TENDRILS (inside the glass) ===
            float ang = u.time * 0.04;
            float2x2 rot = float2x2(cos(ang),-sin(ang),sin(ang),cos(ang));

            // Increased fisheye / refraction for "thicker glass" look
            // Pushed harder to increase warping and edge thickness
            float2 refractedUV = uv * (1.0 - 0.45 * (1.0 - z));
            float3 refN = normalize(float3(refractedUV, sqrt(max(0.001, 1.0 - dot(refractedUV, refractedUV)))));

            float2 sp = rot * (refN.xy * 0.75 + float2(refN.z * 0.20));
            sp += u.tilt * 0.15;

            // Multi-octave warped FBM for colored wisps
            float2 warp0 = float2(fbm(sp*1.8 + float2(0.0,  u.time*0.04), 3),
                                  fbm(sp*1.8 + float2(3.3,  u.time*0.03), 3));
            float2 q  = float2(fbm(sp*2.0 + 2.5*warp0 + float2(0.0,  u.time*0.05), 4),
                               fbm(sp*2.0 + 2.5*warp0 + float2(5.2,  u.time*0.04), 4));
            float2 rv = float2(fbm(sp*1.6 + 4.0*q + float2(1.7, u.time*0.06), 5),
                               fbm(sp*1.6 + 4.0*q + float2(9.2, u.time*0.04), 5));
            float rawSmoke = fbm(sp*1.2 + 3.0*rv + u.time*0.015, 6);

            // Colored wisps: keep threshold high enough to see actual variation
            float edgeFade = 1.0 - smoothstep(0.65, 0.95, r);
            float density = clamp((rawSmoke - 0.28) / 0.45, 0.0, 1.0);
            density = pow(density, 0.9);
            float smokeAlpha = density * edgeFade * 1.4;
            smokeAlpha = clamp(smokeAlpha, 0.0, 0.85);

            // Composite smoke color (60/30/10)
            float3 c0=col[0].rgb, c1=col[1].rgb, c2=col[2].rgb;
            float3 smokeCol = c0 * 0.60 + c1 * 0.30 + c2 * 0.10;
            float luma = dot(smokeCol, float3(0.299, 0.587, 0.114));
            smokeCol = mix(float3(luma), smokeCol, 1.35);
            smokeCol = saturate(smokeCol);

            // === LAYER 1B: WHITE SMOKE OVERLAY (visible through entire orb) ===
            // Separate, higher-freq noise so tendrils are distinct from the color
            float2 wsp = rot * (refN.xy * 1.1 + float2(refN.z * 0.2));
            wsp += u.tilt * 0.08 + float2(7.7, 3.1);  // offset so pattern differs
            float2 wq = float2(fbm(wsp*2.5 + float2(0.0, u.time*0.03), 3),
                               fbm(wsp*2.5 + float2(4.1, u.time*0.025), 3));
            float whiteRaw = fbm(wsp*1.8 + 3.5*wq + u.time*0.02, 5);
            // Wispy threshold — shows tendrils everywhere including center
            float whiteDensity = clamp((whiteRaw - 0.32) / 0.35, 0.0, 1.0);
            whiteDensity = pow(whiteDensity, 1.2);
            float whiteAlpha = whiteDensity * edgeFade * 0.45;
            float3 whiteCol = float3(0.95, 0.96, 0.98);

            // Blend white tendrils into smoke
            smokeCol = smokeCol * (1.0 - whiteAlpha) + whiteCol * whiteAlpha;
            smokeAlpha = clamp(smokeAlpha + whiteAlpha * 0.6, 0.0, 0.90);

            // Volumetric self-shadowing
            float diff = 0.5 + 0.5 * max(0.0, dot(norm, L));
            float coreShadow = smoothstep(0.0, 0.7, density) * 0.30;
            smokeCol = smokeCol * diff * (1.0 - coreShadow);

            // === LAYER 2: CLEAR GLASS SHELL with CHROMATIC ABERRATION ===
            float ebb = 0.5 + 0.5 * sin(u.time * 1.0);

            float fresnelR = pow(1.0 - z, 3.0);
            float fresnelG = pow(1.0 - z, 3.5);
            float fresnelB = pow(1.0 - z, 4.2);
            float3 chromFresnel = float3(fresnelR, fresnelG, fresnelB);

            float3 glassCol = float3(0.97, 0.98, 1.0) * (1.0 + chromFresnel * 0.4);
            float microNoise = noise(uv * 60.0 + u.time * 0.15) * 0.025;
            glassCol += microNoise * max(fresnelR, fresnelB);

            float avgFresnel = (fresnelR + fresnelG + fresnelB) / 3.0;
            float glassAlpha = avgFresnel * (0.5 + 0.12 * ebb);
            glassAlpha = clamp(glassAlpha, 0.0, 0.70);

            // === LAYER 3: GYRO-REACTIVE ENVIRONMENT REFLECTION ===
            float2 reflectUV = norm.xy * 0.5 + u.tilt * 0.35;
            float envHighlight = exp(-dot(reflectUV - float2(0.15, 0.25), reflectUV - float2(0.15, 0.25)) * 6.0);
            float2 reflUV2 = norm.xy * 0.5 + u.tilt * 0.2 + float2(0.3, -0.2);
            float envHighlight2 = exp(-dot(reflUV2, reflUV2) * 10.0) * 0.4;
            float3 envCol = float3(1.0, 0.99, 0.96) * (envHighlight + envHighlight2) * 0.25;

            // === LAYER 4: WHITE RIM BACKLIGHT (directly follows gyro) ===
            float2 rimLightPos = normalize(float2(u.tilt.x, u.tilt.y) + float2(0.001, 0.001));
            float2 pixelRimDir = normalize(uv + float2(0.001, 0.001));
            float rimAlign = dot(pixelRimDir, rimLightPos);
            float rimBright = pow(max(0.0, rimAlign), 8.0);
            float rimEdge = smoothstep(0.65, 0.95, r);
            float rimLight = rimBright * rimEdge * 0.22;
            float3 rimCol = float3(1.0, 0.99, 0.97) * rimLight;

            // === LAYER 5: SPECULAR CAUSTIC (moves with tilt) ===
            float2 specPos = float2(-0.25 + u.tilt.x * 0.3, 0.30 + u.tilt.y * 0.3);
            float specDist = length(uv - specPos);
            float specular = exp(-specDist * specDist * 28.0) * 0.10;
            float3 specColor = float3(1.0, 0.98, 0.94) * specular;

            // === GLASS BASE TINT ===
            float3 baseTint = float3(0.93, 0.94, 0.96);
            float baseAlpha = (0.06 + 0.03 * ebb) * (1.0 - avgFresnel * 0.5);

            // === COMPOSITE ===
            float3 outCol = baseTint * baseAlpha;
            float  outA   = baseAlpha;

            // Smoke wisps
            outCol = outCol * (1.0 - smokeAlpha) + smokeCol * smokeAlpha;
            outA   = clamp(outA + smokeAlpha * 0.95, 0.0, 1.0);

            // Chromatic glass Fresnel rim
            outCol = outCol * (1.0 - glassAlpha) + glassCol * glassAlpha;
            outA   = clamp(outA + glassAlpha, 0.0, 1.0);

            // Environment reflections
            outCol += envCol * smoothstep(0.95, 0.3, r);

            // White rim backlight
            outCol += rimCol;
            outA = clamp(outA + rimLight * 0.5, 0.0, 1.0);

            // Specular caustic
            outCol += specColor * smoothstep(0.9, 0.4, r);

            // Razor-sharp outer edge
            float edgeAlpha = smoothstep(1.0, 0.99, r);
            return float4(outCol * edgeAlpha, outA * edgeAlpha);
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
        if let m = motionManager.deviceMotion {
            // Smooth gyro with exponential moving average to prevent snapping
            let rawTilt = SIMD2<Float>(
                Float(m.gravity.x) * 0.6,
                Float(m.gravity.y) * 0.6
            )
            let lerp: Float = 0.08
            tilt = tilt + (rawTilt - tilt) * lerp
        }

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
            time: Float(Date().timeIntervalSince(OrbRenderer.sharedStartTime)),
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
        if ui.getRed(&r, green: &g, blue: &b, alpha: &a) {
            return SIMD4<Float>(Float(r), Float(g), Float(b), Float(a))
        } else if let components = ui.cgColor.components, ui.cgColor.numberOfComponents >= 3 {
            return SIMD4<Float>(
                Float(components[0]),
                Float(components[1]),
                Float(components[2]),
                Float(components.count >= 4 ? components[3] : 1.0)
            )
        }
        return SIMD4<Float>(0.2, 0.5, 0.9, 1.0) // Fallback
    }
}
