import SwiftUI
import UIKit
import Metal
import MetalKit
import CoreMotion

// MARK: - Metal Stamp Card (SwiftUI wrapper)

struct MetalStampCard: UIViewRepresentable {
    let rarity: Int   // 0=common, 1=rare, 2=epic, 3=legendary
    let crestType: Int // 0-7
    let size: CGSize

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
        view.isUserInteractionEnabled = false

        if let device = view.device {
            context.coordinator.setup(device: device, view: view)
        }
        view.delegate = context.coordinator
        return view
    }

    func updateUIView(_ uiView: MTKView, context: Context) {
        context.coordinator.rarity = rarity
        context.coordinator.crestType = crestType
    }

    func makeCoordinator() -> StampCardRenderer {
        StampCardRenderer(rarity: rarity, crestType: crestType)
    }
}

// MARK: - Renderer

final class StampCardRenderer: NSObject, MTKViewDelegate {
    private var device: MTLDevice!
    private var commandQueue: MTLCommandQueue!
    private var pipelineState: MTLRenderPipelineState?
    private static let sharedStartTime: Date = Date()
    private let motionManager = CMMotionManager()
    private var tilt = SIMD2<Float>(0, 0)
    var rarity: Int
    var crestType: Int

    init(rarity: Int, crestType: Int) {
        self.rarity = rarity
        self.crestType = crestType
        super.init()
        startMotion()
    }

    deinit { motionManager.stopDeviceMotionUpdates() }

    private func startMotion() {
        guard motionManager.isDeviceMotionAvailable else { return }
        motionManager.deviceMotionUpdateInterval = 1.0 / 60.0
        motionManager.startDeviceMotionUpdates()
    }

    func setup(device: MTLDevice, view: MTKView) {
        self.device = device
        self.commandQueue = device.makeCommandQueue()
        buildPipeline(view: view)
    }

    private func buildPipeline(view: MTKView) {
        guard let device = device else { return }

        let src = """
        #include <metal_stdlib>
        using namespace metal;

        struct VertOut { float4 pos [[position]]; float2 uv; };

        vertex VertOut vert(uint vid [[vertex_id]]) {
            float2 pos[4] = {float2(-1,-1),float2(1,-1),float2(-1,1),float2(1,1)};
            VertOut o; o.pos = float4(pos[vid],0,1); o.uv = pos[vid]*0.5+0.5; return o;
        }

        // Noise functions
        float hash2(float2 p){ p=fract(p*float2(127.1,311.7)); p+=dot(p,p+19.19); return fract(p.x*p.y); }
        float noise2(float2 p){
            float2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);
            return mix(mix(hash2(i),hash2(i+float2(1,0)),u.x),
                       mix(hash2(i+float2(0,1)),hash2(i+float2(1,1)),u.x),u.y);
        }
        float fbm2(float2 p, int oct) {
            float v=0.,a=0.5;
            for(int i=0;i<oct;i++){v+=a*noise2(p);p*=2.1;a*=0.5;}
            return v;
        }

        struct Uniforms { float time; float2 tilt; int rarity; int crestType; };

        // SDF helpers
        float sdBox(float2 p, float2 b) { float2 d=abs(p)-b; return length(max(d,0.0))+min(max(d.x,d.y),0.0); }
        float sdCircle(float2 p, float r) { return length(p)-r; }
        float sdTriangle(float2 p, float2 a, float2 b, float2 c) {
            float2 e0=b-a, e1=c-b, e2=a-c;
            float2 v0=p-a, v1=p-b, v2=p-c;
            float2 pq0=v0-e0*clamp(dot(v0,e0)/dot(e0,e0),0.0,1.0);
            float2 pq1=v1-e1*clamp(dot(v1,e1)/dot(e1,e1),0.0,1.0);
            float2 pq2=v2-e2*clamp(dot(v2,e2)/dot(e2,e2),0.0,1.0);
            float s=sign(e0.x*e2.y-e0.y*e2.x);
            float2 d=min(min(float2(dot(pq0,pq0),s*(v0.x*e0.y-v0.y*e0.x)),
                             float2(dot(pq1,pq1),s*(v1.x*e1.y-v1.y*e1.x))),
                             float2(dot(pq2,pq2),s*(v2.x*e2.y-v2.y*e2.x)));
            return -sqrt(d.x)*sign(d.y);
        }
        // Rounded line segment
        float sdSegment(float2 p, float2 a, float2 b) {
            float2 pa=p-a, ba=b-a;
            float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);
            return length(pa-ba*h);
        }

        // Heraldic shield SDF (rounded top, pointed bottom)
        float sdShield(float2 p) {
            float2 q = float2(abs(p.x), p.y);
            if (q.y > 0.0) {
                float d = sdBox(q - float2(0.0, 0.25), float2(0.38, 0.25));
                return d - 0.06;
            }
            float t = clamp(-q.y / 0.55, 0.0, 1.0);
            float w = 0.44 * (1.0 - t*t);
            float dx = q.x - w;
            float dy = q.y + 0.55;
            if (dx > 0.0) return length(float2(dx, min(dy, 0.0)));
            if (dy < 0.0) return max(dx, -dy * 0.5);
            return min(dx, 0.0);
        }

        // Field colors
        void getFieldColors(int cType, thread float3 &bg, thread float3 &trim) {
            if (cType == 0) { bg = float3(0.06, 0.09, 0.22); trim = float3(0.90, 0.75, 0.28); }
            else if (cType == 1) { bg = float3(0.04, 0.14, 0.06); trim = float3(0.80, 0.83, 0.87); }
            else if (cType == 2) { bg = float3(0.25, 0.03, 0.05); trim = float3(0.90, 0.75, 0.28); }
            else if (cType == 3) { bg = float3(0.28, 0.20, 0.04); trim = float3(0.78, 0.55, 0.22); }
            else if (cType == 4) { bg = float3(0.15, 0.04, 0.25); trim = float3(0.80, 0.83, 0.87); }
            else if (cType == 5) { bg = float3(0.04, 0.04, 0.07); trim = float3(0.90, 0.75, 0.28); }
            else if (cType == 6) { bg = float3(0.03, 0.15, 0.19); trim = float3(0.78, 0.55, 0.32); }
            else { bg = float3(0.28, 0.16, 0.05); trim = float3(0.90, 0.78, 0.40); }
        }

        // ==========================================
        // DETAILED PROCEDURAL CRESTS
        // ==========================================
        float crestSDF(float2 p, int cType, float time) {
            p = p * 2.0 - 1.0;
            p.y += 0.1;

            if (cType == 0) {
                // TOWER: detailed turret with battlements, window, door, brickwork hint
                float body = sdBox(p - float2(0.0, -0.08), float2(0.14, 0.28));
                // Roof/spire
                float roof = sdTriangle(p, float2(-0.20, 0.20), float2(0.20, 0.20), float2(0.0, 0.48));
                // Battlements (3 merlons on top)
                float m1 = sdBox(p - float2(-0.10, 0.24), float2(0.035, 0.05));
                float m2 = sdBox(p - float2(0.0, 0.24), float2(0.035, 0.05));
                float m3 = sdBox(p - float2(0.10, 0.24), float2(0.035, 0.05));
                float merlons = min(m1, min(m2, m3));
                // Door arch
                float door = sdCircle(p - float2(0.0, -0.28), 0.055);
                door = max(door, -(p.y + 0.28)); // clip top half to make arch
                float doorRect = sdBox(p - float2(0.0, -0.32), float2(0.055, 0.06));
                door = min(door, doorRect);
                // Window (small circle)
                float window = sdCircle(p - float2(0.0, 0.02), 0.035);
                // Base platform
                float base = sdBox(p - float2(0.0, -0.34), float2(0.22, 0.025));
                float outer = min(body, min(roof, min(merlons, base)));
                // Subtract door and window (they become trim-colored cutouts)
                float cutouts = min(door, window);
                // Return outer shape; cutouts handled separately
                return min(outer, cutouts);
            }
            if (cType == 1) {
                // COLUMNS: two ionic columns with entablature and laurel wreath
                // Left column
                float lc = sdBox(p - float2(-0.12, 0.0), float2(0.04, 0.28));
                float lcCap = sdBox(p - float2(-0.12, 0.28), float2(0.06, 0.02));
                float lcBase = sdBox(p - float2(-0.12, -0.28), float2(0.06, 0.02));
                // Right column
                float rc = sdBox(p - float2(0.12, 0.0), float2(0.04, 0.28));
                float rcCap = sdBox(p - float2(0.12, 0.28), float2(0.06, 0.02));
                float rcBase = sdBox(p - float2(0.12, -0.28), float2(0.06, 0.02));
                // Entablature (beam across top)
                float beam = sdBox(p - float2(0.0, 0.32), float2(0.20, 0.025));
                // Pediment triangle
                float pediment = sdTriangle(p, float2(-0.20, 0.345), float2(0.20, 0.345), float2(0.0, 0.46));
                float pedInner = sdTriangle(p, float2(-0.16, 0.345), float2(0.16, 0.345), float2(0.0, 0.43));
                // Laurel wreath in center
                float wreath = 1.0;
                for (int i = 0; i < 12; i++) {
                    float a = float(i) * 0.524 - 0.2;
                    float2 lp = float2(cos(a)*0.08, sin(a)*0.08);
                    wreath = min(wreath, sdCircle(p - lp, 0.018));
                }
                // Column fluting (vertical lines) - thin subtracted lines
                float flute1 = abs(p.x + 0.12) - 0.005;
                float flute2 = abs(p.x - 0.12) - 0.005;
                float cols = min(min(lc, min(lcCap, lcBase)), min(rc, min(rcCap, rcBase)));
                return min(cols, min(beam, min(pediment, wreath)));
            }
            if (cType == 2) {
                // COMPASS ROSE: 8-point star with inner ring and cardinal markers
                float star = 1.0;
                for (int i = 0; i < 8; i++) {
                    float a = float(i) * 0.7854;
                    float s = (i % 2 == 0) ? 0.35 : 0.22; // cardinal vs ordinal
                    float w = (i % 2 == 0) ? 0.035 : 0.025;
                    float ca = cos(a), sa = sin(a);
                    float2 rp = float2(p.x*ca+p.y*sa, -p.x*sa+p.y*ca);
                    // Diamond shape for each point
                    float point = sdBox(rp, float2(w, s));
                    star = min(star, point);
                }
                // Center disc
                float center = sdCircle(p, 0.06);
                // Inner ring
                float ring = abs(sdCircle(p, 0.12)) - 0.012;
                // Outer ring
                float outerRing = abs(sdCircle(p, 0.30)) - 0.008;
                // N marker (small triangle at top)
                float nMark = sdTriangle(p, float2(-0.025, 0.32), float2(0.025, 0.32), float2(0.0, 0.38));
                return min(star, min(center, min(ring, min(outerRing, nMark))));
            }
            if (cType == 3) {
                // FLAME: layered fire with inner detail and ember particles
                // Main flame body
                float2 fp = p;
                fp.y -= 0.05;
                float mainFlame = 1.0;
                // 5 overlapping teardrop layers for organic shape
                for (int i = 0; i < 5; i++) {
                    float s = 1.0 - float(i) * 0.15;
                    float xoff = (i % 2 == 0) ? 0.0 : ((i == 1) ? 0.04 : -0.04);
                    float2 tp = (fp - float2(xoff, float(i)*0.04)) * (1.0/s);
                    float d = length(float2(tp.x * 1.3, max(tp.y, 0.0)*0.5)) - 0.12;
                    d = min(d, sdCircle(tp + float2(0.0, 0.10), 0.12));
                    mainFlame = min(mainFlame, d * s);
                }
                // Inner bright core
                float core = length(float2(fp.x * 1.5, max(fp.y + 0.05, 0.0)*0.4)) - 0.06;
                core = min(core, sdCircle(fp + float2(0.0, 0.05), 0.06));
                // Base brazier/cup
                float cup = sdBox(fp - float2(0.0, -0.30), float2(0.12, 0.04));
                float cupLeg1 = sdBox(fp - float2(-0.08, -0.36), float2(0.02, 0.04));
                float cupLeg2 = sdBox(fp - float2(0.08, -0.36), float2(0.02, 0.04));
                // Ember particles (small circles floating up)
                float embers = 1.0;
                for (int i = 0; i < 4; i++) {
                    float yOff = float(i) * 0.10 + 0.20;
                    float xOff = sin(float(i) * 2.3) * 0.08;
                    embers = min(embers, sdCircle(fp - float2(xOff, yOff), 0.015));
                }
                return min(mainFlame, min(core, min(cup, min(min(cupLeg1, cupLeg2), embers))));
            }
            if (cType == 4) {
                // EYE OF ARCHITECTURE: detailed eye with pupil, iris rays, brow arch
                // Outer eye (vesica piscis)
                float eye1 = sdCircle(p - float2(0.0, 0.06), 0.24);
                float eye2 = sdCircle(p + float2(0.0, 0.06), 0.24);
                float eyeShape = max(eye1, eye2);
                // Iris ring
                float iris = abs(sdCircle(p, 0.10)) - 0.015;
                // Pupil
                float pupil = sdCircle(p, 0.045);
                // Iris detail rays (16 tiny lines radiating from center)
                float irisDetail = 1.0;
                for (int i = 0; i < 16; i++) {
                    float a = float(i) * 0.3927;
                    float2 dir = float2(cos(a), sin(a));
                    float2 rp2 = float2(dot(p, dir), dot(p, float2(-dir.y, dir.x)));
                    // Only between iris ring radii
                    float ray = sdBox(rp2, float2(0.14, 0.004));
                    float mask = sdCircle(p, 0.05);
                    float outer = sdCircle(p, 0.14);
                    ray = max(ray, -mask);
                    ray = max(ray, outer);
                    irisDetail = min(irisDetail, ray);
                }
                // Brow arch above
                float browDist = sdCircle(p - float2(0.0, 0.12), 0.32);
                float browClip = -(p.y - 0.18);
                float brow = max(abs(browDist) - 0.012, browClip);
                // Radiating lines outside eye
                float outerRays = 1.0;
                for (int i = 0; i < 8; i++) {
                    float a = float(i) * 0.7854;
                    float2 dir = float2(cos(a), sin(a));
                    float2 rp3 = float2(dot(p, dir), dot(p, float2(-dir.y, dir.x)));
                    float ray = sdBox(rp3, float2(0.40, 0.008));
                    float mask = sdCircle(p, 0.22);
                    ray = max(ray, mask);
                    outerRays = min(outerRays, ray);
                }
                return min(eyeShape, min(iris, min(pupil, min(irisDetail, min(brow, outerRays)))));
            }
            if (cType == 5) {
                // CROWN: ornate with jewels, cross on top, ermine trim
                // Base band
                float base = sdBox(p - float2(0.0, -0.10), float2(0.30, 0.06));
                // 5 crown points (alternating heights)
                float points = 1.0;
                for (int i = 0; i < 5; i++) {
                    float x = float(i - 2) * 0.12;
                    float h = (i % 2 == 0) ? 0.30 : 0.20;
                    float tri = sdTriangle(p,
                        float2(x - 0.05, -0.04),
                        float2(x + 0.05, -0.04),
                        float2(x, h));
                    points = min(points, tri);
                }
                // Jewels (circles at base of each point)
                float jewels = 1.0;
                for (int i = 0; i < 5; i++) {
                    float x = float(i - 2) * 0.12;
                    jewels = min(jewels, sdCircle(p - float2(x, -0.04), 0.022));
                }
                // Cross on center point
                float crossV = sdBox(p - float2(0.0, 0.34), float2(0.015, 0.06));
                float crossH = sdBox(p - float2(0.0, 0.36), float2(0.04, 0.012));
                float cross = min(crossV, crossH);
                // Ermine dots on base (small diamonds)
                float ermine = 1.0;
                for (int i = 0; i < 4; i++) {
                    float x = float(i) * 0.14 - 0.21;
                    float2 ep = p - float2(x, -0.10);
                    float2 rep = float2(ep.x*0.707+ep.y*0.707, -ep.x*0.707+ep.y*0.707);
                    ermine = min(ermine, sdBox(rep, float2(0.012, 0.012)));
                }
                // Arches between points
                float arches = 1.0;
                for (int i = 0; i < 4; i++) {
                    float x = float(i) * 0.12 - 0.18;
                    float archD = sdCircle(p - float2(x, -0.04), 0.06);
                    archD = max(archD, -(p.y + 0.04));
                    arches = min(arches, max(abs(archD) - 0.008, 0.0));
                }
                return min(base, min(points, min(jewels, min(cross, min(ermine, arches)))));
            }
            if (cType == 6) {
                // FOOTPATH: winding path with stepping stones, compass arrow
                // Path curve (series of connected arcs)
                float path = 1.0;
                // Main winding path
                float seg1 = sdSegment(p, float2(0.0, -0.40), float2(0.10, -0.20)) - 0.035;
                float seg2 = sdSegment(p, float2(0.10, -0.20), float2(-0.08, 0.0)) - 0.035;
                float seg3 = sdSegment(p, float2(-0.08, 0.0), float2(0.06, 0.18)) - 0.035;
                float seg4 = sdSegment(p, float2(0.06, 0.18), float2(0.0, 0.38)) - 0.035;
                path = min(min(seg1, seg2), min(seg3, seg4));
                // Stepping stones along path
                float stones = 1.0;
                float2 stonePos[6] = {
                    float2(0.04, -0.32), float2(0.10, -0.14),
                    float2(0.02, -0.06), float2(-0.05, 0.06),
                    float2(0.02, 0.18), float2(0.02, 0.30)
                };
                for (int i = 0; i < 6; i++) {
                    stones = min(stones, sdCircle(p - stonePos[i], 0.025));
                }
                // Arrow at top pointing forward
                float arrow = sdTriangle(p, float2(-0.04, 0.34), float2(0.04, 0.34), float2(0.0, 0.44));
                float arrowStem = sdBox(p - float2(0.0, 0.30), float2(0.012, 0.05));
                // Side trees/nature dots
                float trees = 1.0;
                float2 treePos[4] = {
                    float2(-0.18, -0.25), float2(0.22, -0.05),
                    float2(-0.20, 0.12), float2(0.18, 0.28)
                };
                for (int i = 0; i < 4; i++) {
                    float trunk = sdBox(p - treePos[i] - float2(0.0, -0.03), float2(0.008, 0.03));
                    float canopy = sdCircle(p - treePos[i] + float2(0.0, -0.02), 0.03);
                    trees = min(trees, min(trunk, canopy));
                }
                return min(path, min(stones, min(min(arrow, arrowStem), trees)));
            }
            // cType == 7: RISING SUN with horizon cityline
            float2 sp = p;
            sp.y -= 0.05;
            // Sun disc (upper half)
            float sun = sdCircle(sp - float2(0.0, 0.0), 0.16);
            sun = max(sun, sp.y); // clip bottom
            // Sun rays (12 alternating thick/thin)
            float rays = 1.0;
            for (int i = 0; i < 12; i++) {
                float a = float(i) * 0.524 + 0.262;
                float w = (i % 2 == 0) ? 0.018 : 0.010;
                float ca = cos(a), sa = sin(a);
                float2 rp = float2(sp.x*ca+sp.y*sa, -sp.x*sa+sp.y*ca);
                float ray = sdBox(rp, float2(0.38, w));
                // Only above horizon and outside sun
                ray = max(ray, sp.y);
                ray = max(ray, -sdCircle(sp, 0.18));
                rays = min(rays, ray);
            }
            // Horizon line
            float horizon = abs(sp.y) - 0.008;
            horizon = max(horizon, sdBox(sp, float2(0.40, 1.0)));
            // Cityscape silhouette on horizon
            float city = 1.0;
            // Several buildings of varying height
            float b1 = sdBox(sp - float2(-0.28, -0.10), float2(0.04, 0.10));
            float b2 = sdBox(sp - float2(-0.18, -0.12), float2(0.03, 0.12));
            float b3 = sdBox(sp - float2(-0.08, -0.08), float2(0.05, 0.08));
            float b4 = sdBox(sp - float2(0.06, -0.15), float2(0.03, 0.15));
            float spire = sdBox(sp - float2(0.06, -0.01), float2(0.008, 0.06));
            float b5 = sdBox(sp - float2(0.16, -0.10), float2(0.04, 0.10));
            float b6 = sdBox(sp - float2(0.26, -0.06), float2(0.05, 0.06));
            city = min(min(min(b1,b2),min(b3,b4)),min(min(b5,b6),spire));
            return min(sun, min(rays, min(horizon, city)));
        }

        fragment float4 frag(VertOut in [[stage_in]],
                             constant Uniforms &u [[buffer(0)]]) {
            float2 uv = in.uv;
            float2 centered = (uv - 0.5) * float2(1.0, 1.28);

            float shield = sdShield(centered);
            if (shield > 0.02) return float4(0);

            float3 bg, trim;
            getFieldColors(u.crestType, bg, trim);

            // Dawn gradient special case
            if (u.crestType == 7) {
                bg = mix(float3(0.38, 0.18, 0.06), float3(0.06, 0.08, 0.22), uv.y);
            }

            // Subtle field texture (damask-like pattern)
            float damask = fbm2(uv * 12.0 + float2(u.time * 0.01), 3);
            float3 col = bg * (0.92 + damask * 0.16);

            // Diagonal heraldic field division (per pale - subtle lighter half)
            float division = smoothstep(-0.01, 0.01, centered.x);
            col = mix(col, col * 1.08, division * 0.3);

            // Crest element
            float crest = crestSDF(uv, u.crestType, u.time);
            // Crest with glow halo
            float crestGlow = smoothstep(0.06, 0.0, crest);
            col += trim * crestGlow * 0.15;
            // Solid crest fill
            float crestAlpha = smoothstep(0.005, -0.005, crest);
            col = mix(col, trim, crestAlpha * 0.9);
            // Crest inner shadow for depth
            float crestInner = smoothstep(-0.005, -0.025, crest);
            col = mix(col, trim * 0.7, crestInner * 0.2);

            // === HERALDIC BORDERS (triple line) ===
            // Outer border
            float b1 = abs(shield + 0.012) - 0.007;
            col = mix(col, trim, (1.0 - smoothstep(0.0, 0.004, b1)) * 0.95);
            // Middle gap
            float b2 = abs(shield + 0.028) - 0.003;
            col = mix(col, bg * 0.5, (1.0 - smoothstep(0.0, 0.003, b2)) * 0.4);
            // Inner border
            float b3 = abs(shield + 0.040) - 0.005;
            col = mix(col, trim * 0.8, (1.0 - smoothstep(0.0, 0.004, b3)) * 0.7);

            // Corner flourishes (quarter-circle ornaments near top corners)
            float2 tl = centered - float2(-0.32, 0.38);
            float flourishTL = abs(sdCircle(tl, 0.06)) - 0.005;
            col = mix(col, trim * 0.6, (1.0 - smoothstep(0.0, 0.005, flourishTL)) * 0.4 * step(shield, -0.04));

            float2 tr = centered - float2(0.32, 0.38);
            float flourishTR = abs(sdCircle(tr, 0.06)) - 0.005;
            col = mix(col, trim * 0.6, (1.0 - smoothstep(0.0, 0.005, flourishTR)) * 0.4 * step(shield, -0.04));

            // === METALLIC MATERIAL (rarity-driven) ===

            // Brushed metal grain
            float grain = noise2(float2(uv.x * 120.0, uv.y * 10.0 + u.time * 0.2)) * 0.04;
            float grain2 = noise2(float2(uv.x * 10.0, uv.y * 120.0 + u.time * 0.15)) * 0.02;
            col += grain + grain2;

            // Primary specular (moves with tilt)
            float2 specPos = float2(0.5 + u.tilt.x * 0.35, 0.55 + u.tilt.y * 0.35);
            float specDist = length(uv - specPos);
            float specular = exp(-specDist * specDist * 10.0);

            // Fresnel rim
            float edgeDist = -shield;
            float rim = pow(max(0.0, 1.0 - edgeDist * 6.0), 3.5);

            if (u.rarity == 0) {
                // Common: brushed silver with subtle warmth
                col += specular * 0.18 * float3(0.92, 0.90, 0.88);
                col += rim * 0.10 * float3(0.88, 0.86, 0.84);
                // Gentle surface variation
                float surf = noise2(uv * 30.0) * 0.03;
                col += surf;
            } else if (u.rarity == 1) {
                // Rare: polished blue-steel chrome
                col += specular * 0.30 * float3(0.65, 0.78, 1.0);
                float fresnel = pow(rim, 1.5);
                col += fresnel * 0.18 * float3(0.45, 0.65, 1.0);
                // Secondary specular
                float2 sp2 = float2(0.4 - u.tilt.x * 0.2, 0.35 - u.tilt.y * 0.2);
                float spec2 = exp(-length(uv - sp2) * length(uv - sp2) * 18.0);
                col += spec2 * 0.12 * float3(0.55, 0.72, 0.95);
            } else if (u.rarity == 2) {
                // Epic: deep metallic with iridescent shift
                float2 sp2 = float2(0.35 - u.tilt.x * 0.25, 0.3 - u.tilt.y * 0.25);
                float spec2 = exp(-length(uv - sp2) * length(uv - sp2) * 14.0);
                float hueShift = (uv.x + uv.y) * 3.0 + u.tilt.x * 2.0 + u.time * 0.3;
                float3 iri = float3(
                    0.55 + 0.35 * sin(hueShift),
                    0.55 + 0.35 * sin(hueShift + 2.094),
                    0.55 + 0.35 * sin(hueShift + 4.189)
                );
                col += specular * 0.35 * iri;
                col += spec2 * 0.18 * iri;
                col += rim * 0.14 * iri;
                // Subtle interference pattern
                float interf = sin((uv.x + uv.y) * 60.0 + u.tilt.x * 8.0) * 0.03;
                col += interf * iri;
            } else {
                // Legendary: full holographic + diffraction grating
                float hue = uv.y * 4.0 + u.tilt.x * 3.0 + u.time * 0.6;
                float3 rainbow = float3(
                    0.5 + 0.5 * sin(hue),
                    0.5 + 0.5 * sin(hue + 2.094),
                    0.5 + 0.5 * sin(hue + 4.189)
                );
                // Diffraction grating lines
                float diff1 = sin(uv.y * 250.0 + u.tilt.x * 12.0) * 0.5 + 0.5;
                float diff2 = sin(uv.x * 180.0 + u.tilt.y * 8.0) * 0.5 + 0.5;
                col += rainbow * diff1 * 0.22;
                col += rainbow.zxy * diff2 * 0.10;
                col += specular * 0.40 * rainbow;
                // Secondary specular
                float2 sp2 = float2(0.35 - u.tilt.x * 0.3, 0.3 - u.tilt.y * 0.3);
                float spec2 = exp(-length(uv - sp2) * length(uv - sp2) * 12.0);
                col += spec2 * 0.25 * rainbow.yzx;
                col += rim * 0.22 * rainbow;
                // Sparkle particles
                float sparkle = pow(noise2(uv * 80.0 + u.time * 3.0), 8.0) * 0.6;
                col += sparkle * rainbow;
            }

            // Vignette toward edges of shield
            float vignette = smoothstep(-0.02, -0.15, shield);
            col *= 0.85 + vignette * 0.15;

            // Anti-aliased shield edge
            float edgeAlpha = 1.0 - smoothstep(-0.005, 0.005, shield);
            return float4(col * edgeAlpha, edgeAlpha);
        }
        """

        guard let lib = try? device.makeLibrary(source: src, options: nil),
              let vertFn = lib.makeFunction(name: "vert"),
              let fragFn = lib.makeFunction(name: "frag") else {
            print("[MetalStampCard] Shader compile failed")
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
            let rawTilt = SIMD2<Float>(Float(m.gravity.x) * 0.6, Float(m.gravity.y) * 0.6)
            let lerp: Float = 0.08
            tilt = tilt + (rawTilt - tilt) * lerp
        }

        guard let pipeline = pipelineState,
              let descriptor = view.currentRenderPassDescriptor,
              let drawable = view.currentDrawable,
              let buffer = commandQueue.makeCommandBuffer() else { return }

        descriptor.colorAttachments[0].loadAction = .clear
        descriptor.colorAttachments[0].clearColor = MTLClearColor(red: 0, green: 0, blue: 0, alpha: 0)

        guard let encoder = buffer.makeRenderCommandEncoder(descriptor: descriptor) else { return }

        struct Uniforms { var time: Float; var tilt: SIMD2<Float>; var rarity: Int32; var crestType: Int32 }
        var uniforms = Uniforms(
            time: Float(Date().timeIntervalSince(StampCardRenderer.sharedStartTime)),
            tilt: tilt,
            rarity: Int32(rarity),
            crestType: Int32(crestType)
        )

        encoder.setRenderPipelineState(pipeline)
        encoder.setFragmentBytes(&uniforms, length: MemoryLayout<Uniforms>.size, index: 0)
        encoder.drawPrimitives(type: .triangleStrip, vertexStart: 0, vertexCount: 4)
        encoder.endEncoding()

        buffer.present(drawable)
        buffer.commit()
    }
}
