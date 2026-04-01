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
            VertOut o; o.pos = float4(pos[vid],0,1); 
            o.uv = pos[vid]; // [-1, 1] for raymarching projection
            return o;
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

        // Matrix rot
        float2x2 rotX(float a) { float c=cos(a),s=sin(a); return float2x2(c,-s,s,c); }
        float2x2 rotY(float a) { float c=cos(a),s=sin(a); return float2x2(c,-s,s,c); }

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
        float sdSegment(float2 p, float2 a, float2 b) {
            float2 pa=p-a, ba=b-a;
            float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);
            return length(pa-ba*h);
        }

        // Heraldic shield SDF (2D)
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
        // CREST PROCEDURAL GENERATION (2D SDF)
        // ==========================================
        float crestSDF(float2 p, int cType, float time) {
            // Remap input to match original [0,1] based generation
            p = p * float2(2.0, 1.5625);
            p.y += 0.1;

            if (cType == 0) {
                float body = sdBox(p - float2(0.0, -0.08), float2(0.14, 0.28));
                float roof = sdTriangle(p, float2(-0.20, 0.20), float2(0.20, 0.20), float2(0.0, 0.48));
                float m1 = sdBox(p - float2(-0.10, 0.24), float2(0.035, 0.05));
                float m2 = sdBox(p - float2(0.0, 0.24), float2(0.035, 0.05));
                float m3 = sdBox(p - float2(0.10, 0.24), float2(0.035, 0.05));
                float merlons = min(m1, min(m2, m3));
                float door = sdCircle(p - float2(0.0, -0.28), 0.055);
                door = max(door, -(p.y + 0.28)); 
                float doorRect = sdBox(p - float2(0.0, -0.32), float2(0.055, 0.06));
                door = min(door, doorRect);
                float window = sdCircle(p - float2(0.0, 0.02), 0.035);
                float base = sdBox(p - float2(0.0, -0.34), float2(0.22, 0.025));
                float outer = min(body, min(roof, min(merlons, base)));
                float cutouts = min(door, window);
                return max(outer, -cutouts); // True 3D needs actual negative space here
            }
            if (cType == 1) {
                float lc = sdBox(p - float2(-0.12, 0.0), float2(0.04, 0.28));
                float lcCap = sdBox(p - float2(-0.12, 0.28), float2(0.06, 0.02));
                float lcBase = sdBox(p - float2(-0.12, -0.28), float2(0.06, 0.02));
                float rc = sdBox(p - float2(0.12, 0.0), float2(0.04, 0.28));
                float rcCap = sdBox(p - float2(0.12, 0.28), float2(0.06, 0.02));
                float rcBase = sdBox(p - float2(0.12, -0.28), float2(0.06, 0.02));
                float beam = sdBox(p - float2(0.0, 0.32), float2(0.20, 0.025));
                float pediment = sdTriangle(p, float2(-0.20, 0.345), float2(0.20, 0.345), float2(0.0, 0.46));
                float pedInner = sdTriangle(p, float2(-0.16, 0.345), float2(0.16, 0.345), float2(0.0, 0.43));
                float wreath = 1.0;
                for (int i = 0; i < 12; i++) {
                    float a = float(i) * 0.524 - 0.2;
                    float2 lp = float2(cos(a)*0.08, sin(a)*0.08);
                    wreath = min(wreath, sdCircle(p - lp, 0.018));
                }
                float cols = min(min(lc, min(lcCap, lcBase)), min(rc, min(rcCap, rcBase)));
                float outP = min(cols, min(beam, min(pediment, wreath)));
                return max(outP, -pedInner);
            }
            if (cType == 2) {
                float star = 1.0;
                for (int i = 0; i < 8; i++) {
                    float a = float(i) * 0.7854;
                    float s = (i % 2 == 0) ? 0.35 : 0.22; 
                    float w = (i % 2 == 0) ? 0.035 : 0.025;
                    float ca = cos(a), sa = sin(a);
                    float2 rp = float2(p.x*ca+p.y*sa, -p.x*sa+p.y*ca);
                    float point = sdBox(rp, float2(w, s));
                    star = min(star, point);
                }
                float center = sdCircle(p, 0.06);
                float ring = abs(sdCircle(p, 0.12)) - 0.012;
                float outerRing = abs(sdCircle(p, 0.30)) - 0.008;
                float nMark = sdTriangle(p, float2(-0.025, 0.32), float2(0.025, 0.32), float2(0.0, 0.38));
                return min(star, min(center, min(ring, min(outerRing, nMark))));
            }
            if (cType == 3) {
                float2 fp = p;
                fp.y -= 0.05;
                float mainFlame = 1.0;
                for (int i = 0; i < 5; i++) {
                    float s = 1.0 - float(i) * 0.15;
                    float xoff = (i % 2 == 0) ? 0.0 : ((i == 1) ? 0.04 : -0.04);
                    float2 tp = (fp - float2(xoff, float(i)*0.04)) * (1.0/s);
                    float d = length(float2(tp.x * 1.3, max(tp.y, 0.0)*0.5)) - 0.12;
                    d = min(d, sdCircle(tp + float2(0.0, 0.10), 0.12));
                    mainFlame = min(mainFlame, d * s);
                }
                float core = length(float2(fp.x * 1.5, max(fp.y + 0.05, 0.0)*0.4)) - 0.06;
                core = min(core, sdCircle(fp + float2(0.0, 0.05), 0.06));
                float cup = sdBox(fp - float2(0.0, -0.30), float2(0.12, 0.04));
                float cupLeg1 = sdBox(fp - float2(-0.08, -0.36), float2(0.02, 0.04));
                float cupLeg2 = sdBox(fp - float2(0.08, -0.36), float2(0.02, 0.04));
                float embers = 1.0;
                for (int i = 0; i < 4; i++) {
                    float yOff = float(i) * 0.10 + 0.20;
                    float xOff = sin(float(i) * 2.3) * 0.08;
                    embers = min(embers, sdCircle(fp - float2(xOff, yOff), 0.015));
                }
                float outer = min(mainFlame, min(cup, min(min(cupLeg1, cupLeg2), embers)));
                return max(outer, -core);
            }
            if (cType == 4) {
                float eye1 = sdCircle(p - float2(0.0, 0.06), 0.24);
                float eye2 = sdCircle(p + float2(0.0, 0.06), 0.24);
                float eyeShape = max(eye1, eye2);
                float iris = abs(sdCircle(p, 0.10)) - 0.015;
                float pupil = sdCircle(p, 0.045);
                float irisDetail = 1.0;
                for (int i = 0; i < 16; i++) {
                    float a = float(i) * 0.3927;
                    float2 dir = float2(cos(a), sin(a));
                    float2 rp2 = float2(dot(p, dir), dot(p, float2(-dir.y, dir.x)));
                    float ray = sdBox(rp2, float2(0.14, 0.004));
                    float mask = sdCircle(p, 0.05);
                    float outer = sdCircle(p, 0.14);
                    ray = max(ray, -mask);
                    ray = max(ray, outer);
                    irisDetail = min(irisDetail, ray);
                }
                float browDist = sdCircle(p - float2(0.0, 0.12), 0.32);
                float browClip = -(p.y - 0.18);
                float brow = max(abs(browDist) - 0.012, browClip);
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
                float base = sdBox(p - float2(0.0, -0.10), float2(0.30, 0.06));
                float points = 1.0;
                for (int i = 0; i < 5; i++) {
                    float x = float(i - 2) * 0.12;
                    float h = (i % 2 == 0) ? 0.30 : 0.20;
                    float tri = sdTriangle(p, float2(x - 0.05, -0.04), float2(x + 0.05, -0.04), float2(x, h));
                    points = min(points, tri);
                }
                float jewels = 1.0;
                for (int i = 0; i < 5; i++) {
                    float x = float(i - 2) * 0.12;
                    jewels = min(jewels, sdCircle(p - float2(x, -0.04), 0.022));
                }
                float crossV = sdBox(p - float2(0.0, 0.34), float2(0.015, 0.06));
                float crossH = sdBox(p - float2(0.0, 0.36), float2(0.04, 0.012));
                float cross = min(crossV, crossH);
                float ermine = 1.0;
                for (int i = 0; i < 4; i++) {
                    float x = float(i) * 0.14 - 0.21;
                    float2 ep = p - float2(x, -0.10);
                    float2 rep = float2(ep.x*0.707+ep.y*0.707, -ep.x*0.707+ep.y*0.707);
                    ermine = min(ermine, sdBox(rep, float2(0.012, 0.012)));
                }
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
                float path = 1.0;
                float seg1 = sdSegment(p, float2(0.0, -0.40), float2(0.10, -0.20)) - 0.035;
                float seg2 = sdSegment(p, float2(0.10, -0.20), float2(-0.08, 0.0)) - 0.035;
                float seg3 = sdSegment(p, float2(-0.08, 0.0), float2(0.06, 0.18)) - 0.035;
                float seg4 = sdSegment(p, float2(0.06, 0.18), float2(0.0, 0.38)) - 0.035;
                path = min(min(seg1, seg2), min(seg3, seg4));
                float stones = 1.0;
                float2 stonePos[6] = {
                    float2(0.04, -0.32), float2(0.10, -0.14),
                    float2(0.02, -0.06), float2(-0.05, 0.06),
                    float2(0.02, 0.18), float2(0.02, 0.30)
                };
                for (int i = 0; i < 6; i++) {
                    stones = min(stones, sdCircle(p - stonePos[i], 0.025));
                }
                float arrow = sdTriangle(p, float2(-0.04, 0.34), float2(0.04, 0.34), float2(0.0, 0.44));
                float arrowStem = sdBox(p - float2(0.0, 0.30), float2(0.012, 0.05));
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
            
            // cType == 7: RISING SUN
            float2 sp = p;
            sp.y -= 0.05;
            float sun = sdCircle(sp, 0.16);
            sun = max(sun, sp.y); 
            float rays = 1.0;
            for (int i = 0; i < 12; i++) {
                float a = float(i) * 0.524 + 0.262;
                float w = (i % 2 == 0) ? 0.018 : 0.010;
                float ca = cos(a), sa = sin(a);
                float2 rp = float2(sp.x*ca+sp.y*sa, -sp.x*sa+sp.y*ca);
                float ray = sdBox(rp, float2(0.38, w));
                ray = max(ray, sp.y);
                ray = max(ray, -sdCircle(sp, 0.18));
                rays = min(rays, ray);
            }
            float horizon = abs(sp.y) - 0.008;
            horizon = max(horizon, sdBox(sp, float2(0.40, 1.0)));
            float city = 1.0;
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

        // ==========================================
        // 3D SCENE MAP (EXTRUSION)
        // ==========================================
        float map(float3 p, int cType, float time, thread int &matID) {
            float dShield2D = sdShield(p.xy);
            
            // Base Shield Plate (thick)
            float2 wShield = float2(dShield2D, abs(p.z) - 0.04);
            float dShield = min(max(wShield.x, wShield.y), 0.0) + length(max(wShield, 0.0)) - 0.015;
            
            float d = dShield;
            matID = 0; // Field enamel
            
            // Outer Border Rim (sticks out more)
            float dB1_2D = abs(dShield2D + 0.015) - 0.012;
            float2 wB1 = float2(dB1_2D, abs(p.z + 0.01) - 0.045); // shifted toward -z
            float dB1 = min(max(wB1.x, wB1.y), 0.0) + length(max(wB1, 0.0)) - 0.005;
            
            // Inner Border Rim
            float dB2_2D = abs(dShield2D + 0.12) - 0.004;
            float2 wB2 = float2(dB2_2D, abs(p.z + 0.01) - 0.045);
            float dB2 = min(max(wB2.x, wB2.y), 0.0) + length(max(wB2, 0.0)) - 0.004;
            
            // Crest elements
            float dCrest2D = crestSDF(p.xy, cType, time);
            float2 wCrest = float2(dCrest2D, abs(p.z + 0.01) - 0.05); // Thickest
            float dCrest = min(max(wCrest.x, wCrest.y), 0.0) + length(max(wCrest, 0.0)) - 0.006;
            
            if (dB1 < d) { d = dB1; matID = 1; }
            if (dB2 < d) { d = dB2; matID = 1; }
            if (dCrest < d) { d = dCrest; matID = 2; }
            
            return d;
        }

        // ==========================================
        // NORMAL CALCULATION
        // ==========================================
        float3 calcNormal(float3 p, int cType, float time) {
            int dummy;
            float2 e = float2(0.002, 0.0);
            return normalize(float3(
                map(p + e.xyy, cType, time, dummy) - map(p - e.xyy, cType, time, dummy),
                map(p + e.yxy, cType, time, dummy) - map(p - e.yxy, cType, time, dummy),
                map(p + e.yyx, cType, time, dummy) - map(p - e.yyx, cType, time, dummy)
            ));
        }

        // ==========================================
        // MAIN RAYMARCHER
        // ==========================================
        fragment float4 frag(VertOut in [[stage_in]],
                             constant Uniforms &u [[buffer(0)]]) {
            float2 uv = in.uv;
            uv.y *= 1.28; // correct aspect ratio mapping for shield

            // Ray setup
            float3 ro = float3(0.0, 0.0, -2.4);
            float3 rd = normalize(float3(uv, 2.0)); // Narrow FOV to avoid harsh 3D perspective distortion

            float t = 0.0;
            int matID = -1;
            float d = 0.0;
            float minD = 100.0;

            // Emphasize the tilt to show off the 3D depth
            float2x2 rx = rotX(-u.tilt.y * 1.5);
            float2x2 ry = rotY(u.tilt.x * 1.5);

            for(int i = 0; i < 70; i++) {
                float3 p = ro + rd * t;
                
                // Inverse rotate space to tilt object
                float3 p_rot = p;
                p_rot.yz = rx * p_rot.yz;
                p_rot.xz = ry * p_rot.xz;
                
                d = map(p_rot, u.crestType, u.time, matID);
                minD = min(minD, d);
                
                if(d < 0.001 || t > 4.0) break;
                t += d * 0.75; // slightly cautious stepping for complex unions
            }

            // Anti-aliased missed edge
            if (d >= 0.001) {
                float alpha = smoothstep(0.02, 0.0, minD);
                if (alpha <= 0.0) return float4(0);
                
                float3 bg, trim;
                getFieldColors(u.crestType, bg, trim);
                return float4(trim * 0.2, alpha); // dark outer antialiased edge
            }

            // HIT! Calculate normal and rotate back to world space
            float3 p = ro + rd * t;
            float3 p_rot = p;
            p_rot.yz = rx * p_rot.yz;
            p_rot.xz = ry * p_rot.xz;

            float3 n = calcNormal(p_rot, u.crestType, u.time);
            
            // Transpose (inverse) to bring normal back to world
            float2x2 invRy = float2x2(ry[0][0], ry[1][0], ry[0][1], ry[1][1]);
            float2x2 invRx = float2x2(rx[0][0], rx[1][0], rx[0][1], rx[1][1]);
            n.xz = invRy * n.xz;
            n.yz = invRx * n.yz;

            // Setup Lighting
            float3 lightDir = normalize(float3(0.4, 0.8, -1.0));
            float3 viewDir = -rd;
            float3 refl = reflect(-viewDir, n);

            float3 bg, trim;
            getFieldColors(u.crestType, bg, trim);

            // Special dawn gradient
            if (u.crestType == 7 && matID == 0) {
                bg = mix(float3(0.38, 0.18, 0.06), float3(0.06, 0.08, 0.22), p_rot.y + 0.5);
            }

            float3 baseAlbedo = (matID == 0) ? bg : trim;
            float3 finalColor = baseAlbedo * 0.1; // base ambient

            // Spherical Environment Map calculation
            float m = 2.0 * sqrt(refl.x*refl.x + refl.y*refl.y + (refl.z+1.0)*(refl.z+1.0));
            float2 muv = refl.xy / m + 0.5;

            if (matID == 0) {
                // MATTE ENAMEL FIELD
                float diff = max(0.0, dot(n, lightDir));
                float damask = fbm2(p_rot.xy * 12.0 + float2(u.time * 0.01), 3);
                finalColor += bg * diff * (0.8 + damask * 0.2);
                
                float fresnel = pow(max(0.0, 1.0 - dot(n, viewDir)), 4.0);
                finalColor += trim * fresnel * 0.3; // soft edge glow
            } else {
                // HIGHLY POLISHED METAL (Trim & Crest)
                float env1 = smoothstep(0.4, 0.6, sin(muv.y * 25.0 + muv.x * 15.0));
                float env2 = pow(max(0.0, sin(muv.x * 20.0 - muv.y * 30.0)), 4.0);
                float env = env1 * 0.3 + env2 * 0.7 + 0.15;
                
                float fresnel = pow(max(0.0, 1.0 - dot(n, viewDir)), 3.0);
                
                if (u.rarity == 0) {
                    // Common: Brushed Silver
                    finalColor += trim * env * 1.2;
                    finalColor += float3(0.9) * fresnel * 0.5;
                } else if (u.rarity == 1) {
                    // Rare: Blue Steel Chrome
                    finalColor += float3(0.5, 0.7, 1.0) * env * 1.6;
                    finalColor += float3(0.8, 0.9, 1.0) * fresnel * 0.8;
                } else if (u.rarity == 2) {
                    // Epic: Deep Iridescent
                    float shift = refl.y * 4.0 + refl.x * 3.0 + u.time * 0.5;
                    float3 iri = float3(0.6+0.4*sin(shift), 0.6+0.4*sin(shift+2.1), 0.6+0.4*sin(shift+4.2));
                    finalColor += iri * env * 1.8;
                    finalColor += iri * fresnel * 1.0;
                } else {
                    // Legendary: Holographic Gold
                    float hue = refl.x * 6.0 + refl.y * 6.0 + u.time;
                    float3 holo = float3(0.5+0.5*sin(hue), 0.5+0.5*sin(hue+2.1), 0.5+0.5*sin(hue+4.2));
                    float3 gold = float3(1.0, 0.85, 0.3);
                    finalColor += mix(gold, holo, 0.4) * env * 2.2;
                    finalColor += holo * fresnel * 1.2;
                }
                
                // Micro-scratch / brushed texture for realism
                float grain = noise2(p_rot.xy * 250.0) * 0.04;
                finalColor += grain;
                
                // Specular highlight from light source
                float spec = pow(max(0.0, dot(refl, lightDir)), 50.0);
                finalColor += spec * 1.8;
            }

            // Depth/AO darkening (simulated occlusion from ray depth)
            float depthDarkening = clamp((t - 2.2) * 5.0, 0.0, 1.0);
            finalColor *= (1.0 - depthDarkening * 0.2);

            return float4(finalColor, 1.0);
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
