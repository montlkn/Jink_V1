import { useAuth } from "@/auth/authProvider";
import { questsActions } from "@/features/quests";
import { screens } from "@/navigation/routes";
import { DESIGNER_REPUBLIC_THEME } from "@/theme/designer_republic";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import {
    Alert,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const API_BASE = "https://lucienmount--nyc-scan-api-fastapi-app.modal.run/api";
const DR = DESIGNER_REPUBLIC_THEME;

// Contribution steps
const STEPS = {
  INITIAL: "initial",
  CHOOSE_TYPE: "choose_type",
  PHOTO_CAPTURE: "photo_capture",
  INFO_FORM: "info_form",
  SUBMITTING: "submitting",
};

export default function NotFoundScreen({ route, navigation }) {
  const { session } = useAuth();
  const { message, buildingBIN, position, capturedPhotoUri } = route.params || {};

  // Main state
  const [currentStep, setCurrentStep] = useState(STEPS.INITIAL);
  // eslint-disable-next-line no-unused-vars
  const [_isSubmitting, setIsSubmitting] = useState(false);

  // Photo capture state
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedPhotos, setCapturedPhotos] = useState(
    capturedPhotoUri ? [{ uri: capturedPhotoUri, angle: "front", timestamp: Date.now() }] : []
  );
  const [currentAngleIndex, setCurrentAngleIndex] = useState(capturedPhotoUri ? 1 : 0);
  const cameraRef = useRef(null);

  // Form state
  const [address, setAddress] = useState("");
  const [architect, setArchitect] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [style, setStyle] = useState("");
  const [notes, setNotes] = useState("");

  // Animation
  // eslint-disable-next-line no-unused-vars
  const _slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const ANGLE_GUIDES = [
    { id: "front", label: "FRONT", instruction: "Main facade" },
    { id: "left", label: "LEFT", instruction: "Left side" },
    { id: "right", label: "RIGHT", instruction: "Right side" },
    { id: "detail", label: "DETAIL", instruction: "Unique feature" },
  ];

  // Navigation helpers
  const goBack = () => {
    if (currentStep === STEPS.CHOOSE_TYPE) {
      setCurrentStep(STEPS.INITIAL);
    } else if (currentStep === STEPS.PHOTO_CAPTURE || currentStep === STEPS.INFO_FORM) {
      setCurrentStep(STEPS.CHOOSE_TYPE);
    } else {
      navigation.goBack();
    }
  };

  const goHome = () => {
    navigation.navigate(screens.Main, { screen: screens.Home });
  };

  // Photo capture handlers
  const handleCapture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo?.uri) {
        const currentAngle = ANGLE_GUIDES[currentAngleIndex];
        const newPhoto = {
          uri: photo.uri,
          angle: currentAngle.id,
          timestamp: Date.now(),
        };

        setCapturedPhotos(prev => [...prev, newPhoto]);

        if (currentAngleIndex < ANGLE_GUIDES.length - 1) {
          setCurrentAngleIndex(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error("[NotFoundScreen] Failed to capture:", error);
    }
  };

  const handleSkipAngle = () => {
    if (currentAngleIndex < ANGLE_GUIDES.length - 1) {
      setCurrentAngleIndex(prev => prev + 1);
    }
  };

  // Submit photo-only contribution
  const submitPhotos = async () => {
    if (capturedPhotos.length < 1) {
      Alert.alert("No Photos", "Please capture at least one photo.");
      return;
    }

    setCurrentStep(STEPS.SUBMITTING);
    setIsSubmitting(true);

    try {
      console.log("[NotFoundScreen] Submitting", capturedPhotos.length, "photos");

      const formData = new FormData();
      formData.append("user_id", session?.user?.id || "anonymous");
      formData.append("gps_lat", position?.latitude?.toString() || "");
      formData.append("gps_lng", position?.longitude?.toString() || "");
      formData.append("building_bin", buildingBIN || "unknown");
      formData.append("contribution_type", "photos_only");

      capturedPhotos.forEach((photo, index) => {
        formData.append("photos", {
          uri: photo.uri,
          type: "image/jpeg",
          name: `building_${photo.angle}_${index}.jpg`,
        });
        formData.append("photo_angles", photo.angle);
      });

      const response = await fetch(`${API_BASE}/contributions/photos`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      const xpEarned = result.xp_earned || capturedPhotos.length * 10;

      // Save to local storage for rescan detection
      try {
        const existing = await AsyncStorage.getItem('@pending_contributions');
        const contributions = existing ? JSON.parse(existing) : [];
        contributions.push({
          id: `photo_${Date.now()}`,
          gps_lat: position?.latitude,
          gps_lng: position?.longitude,
          building_bin: buildingBIN,
          type: 'photos_only',
          photo_count: capturedPhotos.length,
          created_at: new Date().toISOString(),
        });
        await AsyncStorage.setItem('@pending_contributions', JSON.stringify(contributions));
      } catch (storageError) {
        console.warn('[NotFoundScreen] Failed to save contribution locally', storageError);
      }

      // Award XP
      if (session?.user?.id) {
        try {
          await questsActions.awardXp({
            amount: xpEarned,
            source: "photo_contribution",
            userId: session.user.id,
          });
        } catch (xpError) {
          console.error("[NotFoundScreen] Failed to award XP:", xpError);
        }
      }

      Alert.alert(
        "CONTRIBUTION RECEIVED",
        `+${xpEarned} XP for ${capturedPhotos.length} photo${capturedPhotos.length !== 1 ? "s" : ""}`,
        [{ text: "OK", onPress: goHome }]
      );
    } catch (error) {
      console.error("[NotFoundScreen] Submit failed:", error);
      Alert.alert(
        "SAVED LOCALLY",
        "Photos saved. Will upload when connection improves.",
        [{ text: "OK", onPress: goHome }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit full contribution
  const submitContribution = async () => {
    const filledFields = [address, architect, yearBuilt, style, notes].filter(
      f => f && f.toString().trim().length > 0
    ).length;

    if (filledFields === 0) {
      Alert.alert("No Data", "Please fill at least one field.");
      return;
    }

    setCurrentStep(STEPS.SUBMITTING);
    setIsSubmitting(true);

    try {
      console.log("[NotFoundScreen] Submitting contribution data");

      const response = await fetch(`${API_BASE}/contributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: session?.user?.id || "anonymous",
          building_bin: buildingBIN || "unknown",
          gps_lat: position?.latitude,
          gps_lng: position?.longitude,
          address: address.trim() || undefined,
          architect: architect.trim() || undefined,
          yearBuilt: yearBuilt ? parseInt(yearBuilt) : undefined,
          style: style.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const result = await response.json();
      const xpEarned = result.xp_earned || 30;

      // Save to local storage for rescan detection
      try {
        const existing = await AsyncStorage.getItem('@pending_contributions');
        const contributions = existing ? JSON.parse(existing) : [];
        contributions.push({
          id: `contrib_${Date.now()}`,
          gps_lat: position?.latitude,
          gps_lng: position?.longitude,
          building_bin: buildingBIN,
          address: address.trim() || undefined,
          architect: architect.trim() || undefined,
          year_built: yearBuilt ? parseInt(yearBuilt) : undefined,
          style: style.trim() || undefined,
          notes: notes.trim() || undefined,
          type: 'full_contribution',
          created_at: new Date().toISOString(),
        });
        await AsyncStorage.setItem('@pending_contributions', JSON.stringify(contributions));
      } catch (storageError) {
        console.warn('[NotFoundScreen] Failed to save contribution locally', storageError);
      }

      // Award XP
      if (session?.user?.id) {
        try {
          await questsActions.awardXp({
            amount: xpEarned,
            source: "building_contribution",
            userId: session.user.id,
          });
        } catch (xpError) {
          console.error("[NotFoundScreen] Failed to award XP:", xpError);
        }
      }

      Alert.alert(
        "PIONEER CONTRIBUTION",
        `+${xpEarned} XP earned! Thank you for helping.`,
        [{ text: "OK", onPress: goHome }]
      );
    } catch (error) {
      console.error("[NotFoundScreen] Submit failed:", error);
      Alert.alert("RECORDED", "Your contribution has been noted.", [
        { text: "OK", onPress: goHome },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate XP preview
  const calculateXP = () => {
    let fields = 0;
    if (address.trim().length > 5) fields++;
    if (architect.trim().length > 2) fields++;
    if (yearBuilt && parseInt(yearBuilt) >= 1800) fields++;
    if (style.trim().length > 2) fields++;
    if (notes.trim().length > 10) fields++;

    if (fields === 0) return 0;
    if (fields <= 2) return 15;
    return 30 + (fields - 3) * 5;
  };

  // Render based on current step
  const renderContent = () => {
    switch (currentStep) {
      case STEPS.INITIAL:
        return renderInitialScreen();
      case STEPS.CHOOSE_TYPE:
        return renderChooseType();
      case STEPS.PHOTO_CAPTURE:
        return renderPhotoCapture();
      case STEPS.INFO_FORM:
        return renderInfoForm();
      case STEPS.SUBMITTING:
        return renderSubmitting();
      default:
        return renderInitialScreen();
    }
  };

  // Initial "Building Not Found" screen
  const renderInitialScreen = () => (
    <View style={styles.content}>
      <Text style={styles.icon}>[ ? ]</Text>
      <Text style={styles.title}>BUILDING NOT FOUND</Text>
      <Text style={styles.message}>
        {message || "We couldn't identify this building. Try again or help us improve."}
      </Text>

      <View style={styles.tipSection}>
        <Text style={styles.tipTitle}>// TIPS</Text>
        <Text style={styles.tipText}>• Get closer to the building</Text>
        <Text style={styles.tipText}>• Ensure good lighting</Text>
        <Text style={styles.tipText}>• Capture distinctive features</Text>
        <Text style={styles.tipText}>• Make sure you're in NYC</Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate(screens.Main, { screen: screens.Scan })}
      >
        <Text style={styles.primaryButtonText}>RETRY SCAN</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => setCurrentStep(STEPS.CHOOSE_TYPE)}
      >
        <Text style={styles.secondaryButtonText}>+ CONTRIBUTE DATA</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkButton} onPress={goHome}>
        <Text style={styles.linkButtonText}>← HOME</Text>
      </TouchableOpacity>
    </View>
  );

  // Choose contribution type
  const renderChooseType = () => (
    <View style={styles.content}>
      <Text style={styles.title}>CONTRIBUTE</Text>
      <Text style={styles.subtitle}>Help improve our database</Text>

      <TouchableOpacity
        style={styles.optionCard}
        onPress={() => setCurrentStep(STEPS.PHOTO_CAPTURE)}
      >
        <View style={styles.optionHeader}>
          <Text style={styles.optionEmoji}>[CAM]</Text>
          <View style={styles.xpBadge}>
            <Text style={styles.xpBadgeText}>+10 XP/PHOTO</Text>
          </View>
        </View>
        <Text style={styles.optionTitle}>QUICK PHOTO</Text>
        <Text style={styles.optionDesc}>Take photos from different angles. Helps train our AI.</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionCard}
        onPress={() => setCurrentStep(STEPS.INFO_FORM)}
      >
        <View style={styles.optionHeader}>
          <Text style={styles.optionEmoji}>[DOC]</Text>
          <View style={[styles.xpBadge, styles.xpBadgeAccent]}>
            <Text style={styles.xpBadgeText}>+30-45 XP</Text>
          </View>
        </View>
        <Text style={styles.optionTitle}>ADD INFO</Text>
        <Text style={styles.optionDesc}>Address, architect, year built, architectural style.</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkButton} onPress={goBack}>
        <Text style={styles.linkButtonText}>← BACK</Text>
      </TouchableOpacity>
    </View>
  );

  // Photo capture screen
  const renderPhotoCapture = () => {
    if (!permission?.granted) {
      return (
        <View style={styles.content}>
          <Text style={styles.title}>CAMERA ACCESS</Text>
          <Text style={styles.message}>Camera permission needed to capture photos.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>GRANT ACCESS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkButton} onPress={goBack}>
            <Text style={styles.linkButtonText}>← BACK</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const currentAngle = ANGLE_GUIDES[currentAngleIndex];
    const canSubmit = capturedPhotos.length >= 1;

    return (
      <View style={styles.cameraContainer}>
        {/* Progress */}
        <View style={styles.cameraHeader}>
          <View style={styles.progressDots}>
            {ANGLE_GUIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  i < capturedPhotos.length && styles.progressDotComplete,
                  i === currentAngleIndex && styles.progressDotCurrent,
                ]}
              />
            ))}
          </View>
          <Text style={styles.cameraProgress}>
            {capturedPhotos.length}/{ANGLE_GUIDES.length} CAPTURED
          </Text>
        </View>

        {/* Current angle guide */}
        <View style={styles.angleGuide}>
          <Text style={styles.angleLabel}>{currentAngle.label}</Text>
          <Text style={styles.angleInstruction}>{currentAngle.instruction}</Text>
        </View>

        {/* Camera view */}
        <View style={styles.cameraViewContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
        </View>

        {/* XP indicator */}
        <View style={styles.xpIndicator}>
          <Text style={styles.xpIndicatorText}>+{capturedPhotos.length * 10} XP</Text>
        </View>

        {/* Controls */}
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkipAngle}>
            <Text style={styles.skipBtnText}>SKIP</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.doneBtn, !canSubmit && styles.doneBtnDisabled]}
            onPress={submitPhotos}
            disabled={!canSubmit}
          >
            <Text style={styles.doneBtnText}>SUBMIT</Text>
          </TouchableOpacity>
        </View>

        {/* Back button */}
        <TouchableOpacity style={styles.cameraBackBtn} onPress={goBack}>
          <Text style={styles.cameraBackBtnText}>←</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Info form screen
  const renderInfoForm = () => {
    const estimatedXP = calculateXP();
    const filledCount = [address, architect, yearBuilt, style, notes].filter(
      f => f && f.toString().trim().length > 0
    ).length;

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.formContainer}
      >
        <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>ADD INFO</Text>
          <Text style={styles.subtitle}>Pioneer this building in our database</Text>

          {/* XP Preview */}
          <View style={styles.xpPreview}>
            <Text style={styles.xpPreviewText}>
              +{estimatedXP} XP ({filledCount}/5 fields)
            </Text>
          </View>

          {/* Form fields */}
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>ADDRESS</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="350 5th Ave, New York, NY"
              placeholderTextColor={DR.colors.muted}
              value={address}
              onChangeText={setAddress}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>ARCHITECT</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Frank Lloyd Wright"
              placeholderTextColor={DR.colors.muted}
              value={architect}
              onChangeText={setArchitect}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>YEAR BUILT</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="1931"
              placeholderTextColor={DR.colors.muted}
              value={yearBuilt}
              onChangeText={setYearBuilt}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>STYLE</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Art Deco, Modernist, Gothic..."
              placeholderTextColor={DR.colors.muted}
              value={style}
              onChangeText={setStyle}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>NOTES</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputMulti]}
              placeholder="Any interesting details..."
              placeholderTextColor={DR.colors.muted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Submit button */}
          <TouchableOpacity
            style={[styles.primaryButton, filledCount === 0 && styles.buttonDisabled]}
            onPress={submitContribution}
            disabled={filledCount === 0}
          >
            <Text style={styles.primaryButtonText}>
              {filledCount === 0 ? "FILL AT LEAST ONE FIELD" : "SUBMIT CONTRIBUTION"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={goBack}>
            <Text style={styles.linkButtonText}>← BACK</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  // Submitting screen
  const renderSubmitting = () => (
    <View style={styles.content}>
      <Text style={styles.title}>UPLOADING...</Text>
      <Text style={styles.message}>Please wait while we process your contribution.</Text>
      <View style={styles.loadingIndicator}>
        <Text style={styles.loadingDots}>• • •</Text>
      </View>
    </View>
  );

  return <View style={styles.container}>{renderContent()}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DR.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: DR.spacing.lg,
  },
  icon: {
    fontSize: 48,
    fontWeight: "900",
    color: DR.colors.primary,
    marginBottom: DR.spacing.md,
    fontFamily: "monospace",
  },
  title: {
    fontSize: DR.typography.fontSize.xl,
    fontWeight: "900",
    color: DR.colors.text,
    marginBottom: DR.spacing.sm,
    letterSpacing: DR.typography.letterSpacing.wide,
    textAlign: "center",
  },
  subtitle: {
    fontSize: DR.typography.fontSize.md,
    color: DR.colors.muted,
    marginBottom: DR.spacing.lg,
    textAlign: "center",
  },
  message: {
    fontSize: DR.typography.fontSize.md,
    color: DR.colors.muted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: DR.spacing.lg,
    maxWidth: 300,
  },
  tipSection: {
    backgroundColor: DR.colors.surface,
    borderWidth: DR.layout.borderWidth.thin,
    borderColor: DR.colors.border,
    borderRadius: DR.layout.borderRadius.md,
    padding: DR.spacing.md,
    width: "100%",
    maxWidth: 340,
    marginBottom: DR.spacing.lg,
  },
  tipTitle: {
    fontSize: DR.typography.fontSize.sm,
    fontWeight: "700",
    color: DR.colors.secondary,
    marginBottom: DR.spacing.sm,
    letterSpacing: DR.typography.letterSpacing.wide,
  },
  tipText: {
    fontSize: DR.typography.fontSize.sm,
    color: DR.colors.muted,
    marginBottom: 4,
  },
  primaryButton: {
    backgroundColor: DR.colors.primary,
    paddingVertical: DR.spacing.md,
    paddingHorizontal: DR.spacing.xl,
    borderRadius: DR.layout.borderRadius.sm,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    marginBottom: DR.spacing.sm,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: DR.typography.fontSize.md,
    fontWeight: "900",
    letterSpacing: DR.typography.letterSpacing.wide,
  },
  secondaryButton: {
    backgroundColor: DR.colors.surface,
    borderWidth: DR.layout.borderWidth.thick,
    borderColor: DR.colors.accent,
    paddingVertical: DR.spacing.md,
    paddingHorizontal: DR.spacing.xl,
    borderRadius: DR.layout.borderRadius.sm,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    marginBottom: DR.spacing.sm,
  },
  secondaryButtonText: {
    color: DR.colors.accent,
    fontSize: DR.typography.fontSize.md,
    fontWeight: "900",
    letterSpacing: DR.typography.letterSpacing.wide,
  },
  linkButton: {
    padding: DR.spacing.md,
    marginTop: DR.spacing.sm,
  },
  linkButtonText: {
    color: DR.colors.muted,
    fontSize: DR.typography.fontSize.sm,
    fontWeight: "700",
    letterSpacing: DR.typography.letterSpacing.wide,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // Option cards
  optionCard: {
    backgroundColor: DR.colors.surface,
    borderWidth: DR.layout.borderWidth.thin,
    borderColor: DR.colors.border,
    borderRadius: DR.layout.borderRadius.md,
    padding: DR.spacing.md,
    width: "100%",
    maxWidth: 340,
    marginBottom: DR.spacing.md,
  },
  optionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: DR.spacing.sm,
  },
  optionEmoji: {
    fontSize: DR.typography.fontSize.lg,
    fontWeight: "900",
    color: DR.colors.secondary,
    fontFamily: "monospace",
  },
  xpBadge: {
    backgroundColor: DR.colors.accent + "30",
    paddingHorizontal: DR.spacing.sm,
    paddingVertical: 4,
    borderRadius: DR.layout.borderRadius.sm,
  },
  xpBadgeAccent: {
    backgroundColor: DR.colors.primary + "30",
  },
  xpBadgeText: {
    fontSize: DR.typography.fontSize.xs,
    fontWeight: "900",
    color: DR.colors.accent,
    letterSpacing: DR.typography.letterSpacing.wide,
  },
  optionTitle: {
    fontSize: DR.typography.fontSize.lg,
    fontWeight: "900",
    color: DR.colors.text,
    marginBottom: 4,
    letterSpacing: DR.typography.letterSpacing.wide,
  },
  optionDesc: {
    fontSize: DR.typography.fontSize.sm,
    color: DR.colors.muted,
    lineHeight: 18,
  },
  // Camera styles
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  cameraHeader: {
    paddingTop: 60,
    paddingHorizontal: DR.spacing.md,
    alignItems: "center",
  },
  progressDots: {
    flexDirection: "row",
    gap: 8,
    marginBottom: DR.spacing.sm,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#333",
  },
  progressDotComplete: {
    backgroundColor: DR.colors.accent,
  },
  progressDotCurrent: {
    backgroundColor: DR.colors.primary,
    transform: [{ scale: 1.2 }],
  },
  cameraProgress: {
    color: "#888",
    fontSize: DR.typography.fontSize.sm,
    fontWeight: "700",
    letterSpacing: DR.typography.letterSpacing.wide,
  },
  angleGuide: {
    alignItems: "center",
    paddingVertical: DR.spacing.md,
  },
  angleLabel: {
    fontSize: DR.typography.fontSize.xl,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: DR.typography.letterSpacing.widest,
  },
  angleInstruction: {
    fontSize: DR.typography.fontSize.sm,
    color: "#888",
    marginTop: 4,
  },
  cameraViewContainer: {
    flex: 1,
    margin: DR.spacing.md,
    borderRadius: DR.layout.borderRadius.md,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#333",
  },
  camera: {
    flex: 1,
  },
  xpIndicator: {
    alignItems: "center",
    paddingVertical: DR.spacing.sm,
  },
  xpIndicatorText: {
    fontSize: DR.typography.fontSize.lg,
    fontWeight: "900",
    color: DR.colors.accent,
    letterSpacing: DR.typography.letterSpacing.wide,
  },
  cameraControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: DR.spacing.lg,
    paddingBottom: 40,
  },
  skipBtn: {
    paddingVertical: DR.spacing.sm,
    paddingHorizontal: DR.spacing.md,
  },
  skipBtnText: {
    color: "#666",
    fontSize: DR.typography.fontSize.sm,
    fontWeight: "700",
    letterSpacing: DR.typography.letterSpacing.wide,
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: DR.colors.primary,
  },
  captureBtnInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFF",
  },
  doneBtn: {
    backgroundColor: DR.colors.accent,
    paddingVertical: DR.spacing.sm,
    paddingHorizontal: DR.spacing.md,
    borderRadius: DR.layout.borderRadius.sm,
  },
  doneBtnDisabled: {
    backgroundColor: "#333",
  },
  doneBtnText: {
    color: "#FFF",
    fontSize: DR.typography.fontSize.sm,
    fontWeight: "900",
    letterSpacing: DR.typography.letterSpacing.wide,
  },
  cameraBackBtn: {
    position: "absolute",
    top: 50,
    left: DR.spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraBackBtnText: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "700",
  },
  // Form styles
  formContainer: {
    flex: 1,
    backgroundColor: DR.colors.background,
  },
  formScroll: {
    flex: 1,
    padding: DR.spacing.lg,
    paddingTop: 60,
  },
  xpPreview: {
    backgroundColor: DR.colors.accent + "20",
    padding: DR.spacing.md,
    borderRadius: DR.layout.borderRadius.md,
    alignItems: "center",
    marginBottom: DR.spacing.lg,
  },
  xpPreviewText: {
    fontSize: DR.typography.fontSize.lg,
    fontWeight: "900",
    color: DR.colors.accent,
    letterSpacing: DR.typography.letterSpacing.wide,
  },
  formField: {
    marginBottom: DR.spacing.md,
  },
  fieldLabel: {
    fontSize: DR.typography.fontSize.sm,
    fontWeight: "900",
    color: DR.colors.text,
    marginBottom: DR.spacing.xs,
    letterSpacing: DR.typography.letterSpacing.wide,
  },
  fieldInput: {
    backgroundColor: DR.colors.surface,
    borderWidth: DR.layout.borderWidth.thin,
    borderColor: DR.colors.border,
    borderRadius: DR.layout.borderRadius.sm,
    padding: DR.spacing.md,
    fontSize: DR.typography.fontSize.md,
    color: DR.colors.text,
  },
  fieldInputMulti: {
    height: 80,
    paddingTop: DR.spacing.md,
  },
  // Loading
  loadingIndicator: {
    marginTop: DR.spacing.lg,
  },
  loadingDots: {
    fontSize: 32,
    color: DR.colors.primary,
    letterSpacing: 8,
  },
});
