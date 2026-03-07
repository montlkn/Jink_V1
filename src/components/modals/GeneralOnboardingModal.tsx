import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { FlipModal } from './FlipModal';
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { Ionicons } from "@expo/vector-icons";

type OnboardingStep = {
  title: string;
  description: string;
  icon: string;
  color: string;
};

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: "SCAN THE CITY",
    description: "Point your camera at buildings to identify them. Each scan adds to your Architectural Aesthetic Profile and earns you XP.",
    icon: "camera-outline",
    color: "#00AEEF",
  },
  {
    title: "JINKS & JOURNEYS",
    description: "Start a 'Jink' to explore a curated route based on your unique tastes. Follow the path to discover hidden gems and architectural icons.",
    icon: "map-outline",
    color: "#10b981",
  },
  {
    title: "STAMPS & VISAS",
    description: "Collect stamps for every building you scan. Complete lists to earn Visas and unlock exclusive ranks in the global architectural order.",
    icon: "document-text-outline",
    color: "#a855f7",
  },
];

type GeneralOnboardingModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function GeneralOnboardingModal({
  visible,
  onClose,
}: GeneralOnboardingModalProps): JSX.Element {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const step = ONBOARDING_STEPS[currentStep];

  return (
    <FlipModal visible={visible} onClose={onClose}>
      <View style={[styles.container, { borderColor: step.color }]}>
        <View style={[styles.headerBadge, { backgroundColor: step.color }]}>
          <Text style={styles.badgeText}>INTEL: OPERATIONAL GUIDE</Text>
        </View>

        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: `${step.color}20` }]}>
            <Ionicons name={step.icon as any} size={64} color={step.color} />
          </View>

          <Text style={[styles.title, { color: step.color }]}>{step.title}</Text>
          <Text style={styles.description}>{step.description}</Text>

          <View style={styles.progressDots}>
            {ONBOARDING_STEPS.map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.dot, 
                  { backgroundColor: i === currentStep ? step.color : 'rgba(255,255,255,0.1)' }
                ]} 
              />
            ))}
          </View>

          <TouchableOpacity 
            style={[styles.nextButton, { backgroundColor: step.color }]} 
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>
              {currentStep === ONBOARDING_STEPS.length - 1 ? "INITIALIZE" : "NEXT"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </FlipModal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    padding: 32,
    minHeight: 450,
    justifyContent: 'center',
  },
  headerBadge: {
    position: 'absolute',
    top: -12,
    left: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: theme.colors.background,
    letterSpacing: 1.5,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Courier',
    marginBottom: 32,
    opacity: 0.8,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 0,
  },
  nextButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});
