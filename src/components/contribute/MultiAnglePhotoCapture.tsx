/**
 * MultiAnglePhotoCapture Component
 *
 * Guides users to capture photos from multiple angles for better CLIP matching.
 * - Shows which angles are needed (front, left, right, detail)
 * - Progress indicator
 * - XP rewards increase with more angles
 */

import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import { APP_COLORS } from '../../constants/appColors';

interface CapturedPhoto {
  uri: string;
  angle: string;
  timestamp: number;
}

interface MultiAnglePhotoCaptureProps {
  visible: boolean;
  onComplete: (photos: CapturedPhoto[]) => void;
  onCancel: () => void;
  initialPhoto?: string; // The photo that was already taken during scan
}

const ANGLE_GUIDES = [
  { id: 'front', label: 'Front View', emoji: '🏛️', instruction: 'Capture the main facade' },
  { id: 'left', label: 'Left Side', emoji: '👈', instruction: 'Step left and capture the side' },
  { id: 'right', label: 'Right Side', emoji: '👉', instruction: 'Step right and capture the side' },
  { id: 'detail', label: 'Detail Shot', emoji: '🔍', instruction: 'Capture a unique architectural detail' },
];

const XP_PER_PHOTO = 10;

export const MultiAnglePhotoCapture: React.FC<MultiAnglePhotoCaptureProps> = ({
  visible,
  onComplete,
  onCancel,
  initialPhoto,
}) => {
  console.log('[MultiAnglePhotoCapture] Component rendering, visible:', visible);
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  console.log('[MultiAnglePhotoCapture] Permission state:', hasPermission);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>(
    initialPhoto
      ? [{ uri: initialPhoto, angle: 'front', timestamp: Date.now() }]
      : []
  );
  const [currentAngleIndex, setCurrentAngleIndex] = useState(initialPhoto ? 1 : 0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const cameraRef = useRef<Camera>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Request permission on mount if needed
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // Pulse animation for capture button
  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const currentAngle = ANGLE_GUIDES[currentAngleIndex];
  const totalXP = capturedPhotos.length * XP_PER_PHOTO;
  const isComplete = capturedPhotos.length >= 2; // Minimum 2 photos to complete

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePhoto();

      if (photo?.path) {
        const newPhoto: CapturedPhoto = {
          uri: `file://${photo.path}`,
          angle: currentAngle.id,
          timestamp: Date.now(),
        };

        setCapturedPhotos(prev => [...prev, newPhoto]);

        // Move to next angle or show preview
        if (currentAngleIndex < ANGLE_GUIDES.length - 1) {
          setCurrentAngleIndex(prev => prev + 1);
        } else {
          setShowPreview(true);
        }
      }
    } catch (error) {
      console.error('Failed to capture photo:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSkipAngle = () => {
    if (currentAngleIndex < ANGLE_GUIDES.length - 1) {
      setCurrentAngleIndex(prev => prev + 1);
    } else {
      setShowPreview(true);
    }
  };

  const handleFinish = () => {
    onComplete(capturedPhotos);
  };

  const handleRemovePhoto = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  if (!visible) {
    console.log('[MultiAnglePhotoCapture] Not visible, returning null');
    return null;
  }

  console.log('[MultiAnglePhotoCapture] Visible, checking permission...');

  // Permission request screen
  if (!hasPermission || !device) {
    console.log('[MultiAnglePhotoCapture] Permission not granted, showing permission screen');
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionText}>
            We need camera access to capture building photos
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Access</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  // Preview screen (after capturing)
  if (showPreview) {
    console.log('[MultiAnglePhotoCapture] Showing preview screen with', capturedPhotos.length, 'photos');
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Review Your Photos</Text>
            <View style={styles.xpBadgeLarge}>
              <Text style={styles.xpTextLarge}>+{totalXP} XP</Text>
            </View>
          </View>

          <View style={styles.photoGrid}>
            {capturedPhotos.map((photo, index) => (
              <View key={index} style={styles.photoGridItem}>
                <Image source={{ uri: photo.uri }} style={styles.photoThumbnail} />
                <Text style={styles.photoAngle}>
                  {ANGLE_GUIDES.find(a => a.id === photo.angle)?.emoji} {photo.angle}
                </Text>
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => handleRemovePhoto(index)}
                >
                  <Text style={styles.removePhotoText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {capturedPhotos.length < 4 && (
            <TouchableOpacity
              style={styles.addMoreButton}
              onPress={() => setShowPreview(false)}
            >
              <Text style={styles.addMoreText}>+ Add More Photos (+{XP_PER_PHOTO} XP each)</Text>
            </TouchableOpacity>
          )}

          <View style={styles.previewActions}>
            <TouchableOpacity
              style={[styles.finishButton, !isComplete && styles.finishButtonDisabled]}
              onPress={handleFinish}
              disabled={!isComplete}
            >
              <Text style={styles.finishButtonText}>
                Submit {capturedPhotos.length} Photo{capturedPhotos.length !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButtonOutline} onPress={onCancel}>
              <Text style={styles.cancelButtonOutlineText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {!isComplete && (
            <Text style={styles.minPhotosHint}>
              Need at least 2 photos to submit
            </Text>
          )}
        </View>
      </Modal>
    );
  }

  // Camera capture screen
  console.log('[MultiAnglePhotoCapture] Showing camera capture screen');
  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            {ANGLE_GUIDES.map((angle, index) => (
              <View
                key={angle.id}
                style={[
                  styles.progressDot,
                  index < capturedPhotos.length && styles.progressDotComplete,
                  index === currentAngleIndex && styles.progressDotCurrent,
                ]}
              />
            ))}
          </View>
          <Text style={styles.progressText}>
            {capturedPhotos.length}/{ANGLE_GUIDES.length} angles captured
          </Text>
        </View>

        {/* Angle guide */}
        <View style={styles.guideContainer}>
          <Text style={styles.guideEmoji}>{currentAngle.emoji}</Text>
          <Text style={styles.guideLabel}>{currentAngle.label}</Text>
          <Text style={styles.guideInstruction}>{currentAngle.instruction}</Text>
        </View>

        {/* Camera view */}
        <View style={styles.cameraContainer}>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            device={device}
            isActive={visible && !showPreview}
            photo={true}
            photoQualityBalance="speed"
          >
            {/* Framing guide overlay */}
            <View style={styles.framingGuide}>
              <View style={styles.framingCorner} />
              <View style={[styles.framingCorner, styles.framingCornerTR]} />
              <View style={[styles.framingCorner, styles.framingCornerBL]} />
              <View style={[styles.framingCorner, styles.framingCornerBR]} />
            </View>
          </Camera>
        </View>

        {/* XP indicator */}
        <View style={styles.xpIndicator}>
          <Text style={styles.xpIndicatorText}>Current: +{totalXP} XP</Text>
          <Text style={styles.xpIndicatorHint}>+{XP_PER_PHOTO} XP per photo</Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkipAngle}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>

          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
              onPress={handleCapture}
              disabled={isCapturing}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={[styles.doneButton, !isComplete && styles.doneButtonDisabled]}
            onPress={() => setShowPreview(true)}
            disabled={!isComplete}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Captured photos strip */}
        {capturedPhotos.length > 0 && (
          <View style={styles.photoStrip}>
            {capturedPhotos.map((photo, index) => (
              <Image
                key={index}
                source={{ uri: photo.uri }}
                style={styles.photoStripItem}
              />
            ))}
          </View>
        )}

        {/* Cancel button */}
        <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  progressContainer: {
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  progressBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.muted,
  },
  progressDotComplete: {
    backgroundColor: APP_COLORS.success,
  },
  progressDotCurrent: {
    backgroundColor: APP_COLORS.accent,
    transform: [{ scale: 1.2 }],
  },
  progressText: {
    color: theme.colors.muted,
    fontSize: theme.typography.fontSize.md,
  },
  guideContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  guideEmoji: {
    fontSize: theme.typography.fontSize.xxxxl,
    marginBottom: 8,
  },
  guideLabel: {
    fontSize: theme.typography.fontSize.lgPlus,
    fontWeight: '700',
    color: theme.colors.white,
    marginBottom: 4,
  },
  guideInstruction: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.muted,
  },
  cameraContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  framingGuide: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 40,
  },
  framingCorner: {
    width: 40,
    height: 40,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: theme.colors.white + '99',
    position: 'absolute',
    top: 40,
    left: 40,
  },
  framingCornerTR: {
    borderTopWidth: 3,
    borderLeftWidth: 0,
    borderRightWidth: 3,
    left: undefined,
    right: 40,
  },
  framingCornerBL: {
    borderTopWidth: 0,
    borderBottomWidth: 3,
    top: undefined,
    bottom: 40,
  },
  framingCornerBR: {
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    left: undefined,
    right: 40,
    top: undefined,
    bottom: 40,
  },
  xpIndicator: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  xpIndicatorText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '700',
    color: APP_COLORS.success,
  },
  xpIndicatorHint: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.muted,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 40,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipButtonText: {
    color: theme.colors.muted,
    fontSize: theme.typography.fontSize.base,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.white + '4D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.white,
  },
  doneButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: APP_COLORS.success,
    borderRadius: 20,
  },
  doneButtonDisabled: {
    backgroundColor: theme.colors.muted,
  },
  doneButtonText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
  },
  photoStrip: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 8,
  },
  photoStripItem: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: APP_COLORS.success,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.black + '80',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.xl,
  },
  // Permission screen
  permissionContainer: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '700',
    color: APP_COLORS.text,
    marginBottom: 12,
  },
  permissionText: {
    fontSize: theme.typography.fontSize.base,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: APP_COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 12,
  },
  permissionButtonText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.base,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  cancelButtonText: {
    color: APP_COLORS.textSecondary,
    fontSize: theme.typography.fontSize.base,
  },
  // Preview screen
  previewContainer: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
    paddingTop: 60,
    padding: 24,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  previewTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: '700',
    color: APP_COLORS.text,
  },
  xpBadgeLarge: {
    backgroundColor: APP_COLORS.success + '30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  xpTextLarge: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '700',
    color: APP_COLORS.success,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  photoGridItem: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },
  photoAngle: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: theme.colors.black + 'B3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.sm,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: APP_COLORS.error + 'E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.lgPlus,
    fontWeight: '700',
    marginTop: -2,
  },
  addMoreButton: {
    borderWidth: 2,
    borderColor: APP_COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  addMoreText: {
    color: APP_COLORS.textSecondary,
    fontSize: theme.typography.fontSize.md,
  },
  previewActions: {
    gap: 12,
  },
  finishButton: {
    backgroundColor: APP_COLORS.success,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  finishButtonDisabled: {
    backgroundColor: APP_COLORS.border,
  },
  finishButtonText: {
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
  },
  cancelButtonOutline: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  cancelButtonOutlineText: {
    color: APP_COLORS.textSecondary,
    fontSize: theme.typography.fontSize.base,
  },
  minPhotosHint: {
    textAlign: 'center',
    color: APP_COLORS.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    marginTop: 12,
  },
});

export default MultiAnglePhotoCapture;
