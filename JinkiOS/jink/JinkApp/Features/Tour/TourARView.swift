import SwiftUI
import ARKit
import SceneKit
import CoreLocation

// MARK: - ARViewContainer

struct TourARView: UIViewRepresentable {
    let checkpoint: TourCheckpoint?
    let isNear: Bool

    func makeUIView(context: Context) -> ARSCNView {
        let arView = ARSCNView()
        arView.delegate = context.coordinator
        arView.showsStatistics = false
        arView.autoenablesDefaultLighting = true
        
        // Setup configuration
        if ARGeoTrackingConfiguration.isSupported {
            let config = ARGeoTrackingConfiguration()
            config.planeDetection = .horizontal
            arView.session.run(config)
        } else {
            // Fallback to world tracking if geo-tracking isn't supported (e.g. testing on simulator or out of zone)
            let config = ARWorldTrackingConfiguration()
            config.worldAlignment = .gravityAndHeading
            arView.session.run(config)
        }
        
        return arView
    }
    
    func updateUIView(_ uiView: ARSCNView, context: Context) {
        // If we have a new checkpoint, clear old anchors and add the new one
        guard let checkpoint = checkpoint else { return }
        
        if context.coordinator.currentCheckpointId != checkpoint.id {
            context.coordinator.currentCheckpointId = checkpoint.id
            
            // Remove existing geo anchors
            if let session = uiView.session as? ARSession {
                for anchor in session.currentFrame?.anchors ?? [] {
                    if anchor is ARGeoAnchor {
                        session.remove(anchor: anchor)
                    }
                }
                
                // Add new geo anchor if supported
                if ARGeoTrackingConfiguration.isSupported {
                    let coordinate = CLLocationCoordinate2D(latitude: checkpoint.latitude, longitude: checkpoint.longitude)
                    let geoAnchor = ARGeoAnchor(coordinate: coordinate)
                    session.add(anchor: geoAnchor)
                } else {
                    // Fallback visual: just place a node 5 meters ahead for testing
                    uiView.scene.rootNode.enumerateChildNodes { node, _ in
                        if node.name == "fallback_pin" { node.removeFromParentNode() }
                    }
                    let pinNode = createPinNode(isNear: isNear)
                    pinNode.name = "fallback_pin"
                    pinNode.position = SCNVector3(0, 0, -5)
                    uiView.scene.rootNode.addChildNode(pinNode)
                }
            }
        }
        
        // Update the visual state of the node if proximity changed
        if let session = uiView.session as? ARSession, ARGeoTrackingConfiguration.isSupported {
            for anchor in session.currentFrame?.anchors ?? [] {
                if let geoAnchor = anchor as? ARGeoAnchor,
                   let node = uiView.node(for: geoAnchor) {
                    // Update material color based on proximity
                    if let geometry = node.childNodes.first?.geometry {
                        geometry.firstMaterial?.diffuse.contents = isNear ? UIColor.systemGreen : UIColor(AppColors.accent)
                    }
                }
            }
        } else {
            // Update fallback node
            uiView.scene.rootNode.enumerateChildNodes { node, _ in
                if node.name == "fallback_pin" {
                    if let geometry = node.childNodes.first?.geometry {
                        geometry.firstMaterial?.diffuse.contents = isNear ? UIColor.systemGreen : UIColor(AppColors.accent)
                    }
                }
            }
        }
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }
    
    // MARK: - Coordinator
    
    class Coordinator: NSObject, ARSCNViewDelegate {
        var currentCheckpointId: String? = nil
        
        func renderer(_ renderer: SCNSceneRenderer, didAdd node: SCNNode, for anchor: ARAnchor) {
            guard anchor is ARGeoAnchor else { return }
            
            // When the ARGeoAnchor is resolved in the real world, attach our 3D pin to it
            let pinNode = createPinNode(isNear: false) // Defaults to standard color, gets updated in updateUIView
            
            // Make the pin float slightly above the ground
            pinNode.position = SCNVector3(0, 2.0, 0) 
            
            // Add a slow rotation animation
            let spin = CABasicAnimation(keyPath: "rotation")
            spin.toValue = NSValue(scnVector4: SCNVector4(x: 0, y: 1, z: 0, w: Float.pi * 2))
            spin.duration = 4.0
            spin.repeatCount = .infinity
            pinNode.addAnimation(spin, forKey: "spin")
            
            node.addChildNode(pinNode)
        }
    }
}

// MARK: - SceneKit Helpers

fileprivate func createPinNode(isNear: Bool) -> SCNNode {
    // A stylized 3D diamond/pyramid
    let pyramid = SCNPyramid(width: 1.0, height: 2.0, length: 1.0)
    
    let material = SCNMaterial()
    material.diffuse.contents = isNear ? UIColor.systemGreen : UIColor(AppColors.accent)
    material.lightingModel = .physicallyBased
    material.metalness.contents = 0.8
    material.roughness.contents = 0.2
    
    pyramid.materials = [material]
    
    let node = SCNNode(geometry: pyramid)
    
    // Flip it upside down so it points at the ground
    node.eulerAngles = SCNVector3(Float.pi, 0, 0)
    
    return node
}
