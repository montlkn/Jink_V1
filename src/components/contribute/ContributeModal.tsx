import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import { APP_COLORS } from '../../constants/appColors';

interface ContributeModalProps {
  visible: boolean;
  buildingBIN: string;
  onClose: () => void;
  onSubmit: (contributionData: ContributionData) => void;
}

export interface ContributionData {
  address?: string;
  architect?: string;
  yearBuilt?: number;
  style?: string;
  notes?: string;
  mat_prim?: string;
  mat_secondary?: string;
  mat_tertiary?: string;
}

export const ContributeModal: React.FC<ContributeModalProps> = ({
  visible,
  buildingBIN,
  onClose,
  onSubmit,
}) => {
  console.log('[ContributeModal] Rendering, visible:', visible, 'buildingBIN:', buildingBIN);
  const [address, setAddress] = useState('');
  const [architect, setArchitect] = useState('');
  const [yearBuilt, setYearBuilt] = useState('');
  const [style, setStyle] = useState('');
  const [notes, setNotes] = useState('');
  const [matprim, setMatprim] = useState('');
  const [matsecondary, setMatsecondary] = useState('');
  const [mattertiary, setMattertiary] = useState('');

  const calculateXP = () => {
    // Base XP logic
    let fields = 0;

    if (address.trim().length > 5) fields++;
    if (architect.trim().length > 2) fields++;
    if (yearBuilt && parseInt(yearBuilt) >= 1800 && parseInt(yearBuilt) <= 2030) fields++;
    if (style.trim().length > 2) fields++;
    if (notes.trim().length > 10) fields++;

    // Count materials (each material = 5 XP bonus)
    let materials = 0;
    if (matprim.trim().length > 2) materials++;
    if (matsecondary.trim().length > 2) materials++;
    if (mattertiary.trim().length > 2) materials++;

    fields += materials;

    if (fields === 0) return 0;
    if (fields === 1) return 10;
    if (fields <= 2) return 15;

    const calculatedBaseXP = 30;
    const materialsXP = materials * 5;
    return calculatedBaseXP + materialsXP;
  };

  const handleSubmit = () => {
    const contributionData: ContributionData = {
      address: address.trim() || undefined,
      architect: architect.trim() || undefined,
      yearBuilt: yearBuilt ? parseInt(yearBuilt) : undefined,
      style: style.trim() || undefined,
      notes: notes.trim() || undefined,
      mat_prim: matprim.trim() || undefined,
      mat_secondary: matsecondary.trim() || undefined,
      mat_tertiary: mattertiary.trim() || undefined,
    };

    // Only submit if at least one field is filled
    if (Object.values(contributionData).some(v => v !== undefined)) {
      onSubmit(contributionData);
    }
  };

  const estimatedXP = calculateXP();
  const filledFields = [address, architect, yearBuilt, style, notes, matprim, matsecondary, mattertiary].filter(
    (f) => f && f.toString().trim().length > 0
  ).length;

  if (!visible) {
    console.log('[ContributeModal] Not visible, returning null');
    return null;
  }

  console.log('[ContributeModal] Showing modal UI');

  const onGestureEvent = (event: any) => {
    const { translationY, velocityY } = event.nativeEvent;
    if (translationY > 100 || (velocityY > 500 && translationY > 50)) {
      onClose();
    }
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
          pointerEvents="box-none"
        >
          <PanGestureHandler onGestureEvent={onGestureEvent}>
            <View style={styles.modalContainer} pointerEvents="auto">
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>🏆 Pioneer Contribution</Text>
              <Text style={styles.subtitle}>
                Help us improve our database! Every field you fill earns more XP.
              </Text>
            </View>

            {/* XP Progress */}
            <View style={styles.xpBanner}>
              <Text style={styles.xpText}>
                {estimatedXP} XP ({filledFields}/8 fields)
              </Text>
              <Text style={styles.xpSubtext}>
                {filledFields >= 5 ? '🎉 Full contribution!' : '💡 Fill more fields for bonus XP'}
              </Text>
            </View>

            {/* Form Fields */}
            <View style={styles.form}>
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Address *</Text>
                <Text style={styles.hint}>Street address of the building</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 350 5th Ave, New York, NY"
                  value={address}
                  onChangeText={setAddress}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Architect</Text>
                <Text style={styles.hint}>Who designed this building?</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Frank Lloyd Wright"
                  value={architect}
                  onChangeText={setArchitect}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Year Built</Text>
                <Text style={styles.hint}>When was it completed?</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 1931"
                  value={yearBuilt}
                  onChangeText={setYearBuilt}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Architectural Style</Text>
                <Text style={styles.hint}>Art Deco, Modernist, Gothic, etc.</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Art Deco"
                  value={style}
                  onChangeText={setStyle}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Additional Notes</Text>
                <Text style={styles.hint}>Any interesting details?</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="e.g., Featured in King Kong, tallest building in NYC until 1970..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Primary Material (+5 XP)</Text>
                <Text style={styles.hint}>Main building material (e.g., Brick, Limestone, Steel)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Brick"
                  value={matprim}
                  onChangeText={setMatprim}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Secondary Material (+5 XP)</Text>
                <Text style={styles.hint}>Secondary material (e.g., Terracotta, Glass, Concrete)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Terracotta"
                  value={matsecondary}
                  onChangeText={setMatsecondary}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Tertiary Material (+5 XP)</Text>
                <Text style={styles.hint}>Additional material (e.g., Bronze, Marble, Wood)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Marble"
                  value={mattertiary}
                  onChangeText={setMattertiary}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Rewards Preview */}
            <View style={styles.rewardsPreview}>
              <Text style={styles.rewardsTitle}>You'll Earn:</Text>
              <View style={styles.rewardsList}>
                <Text style={styles.rewardItem}>
                  ✨ +{estimatedXP + 15} XP (includes Pioneer bonus)
                </Text>
                <Text style={styles.rewardItem}>🏆 Pioneer Stamp</Text>
                <Text style={styles.rewardItem}>📍 Data Validator Stamp</Text>
                {filledFields >= 3 && (
                  <Text style={styles.rewardItem}>⭐ Full Contribution Bonus!</Text>
                )}
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttons}>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  filledFields === 0 && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={filledFields === 0}
                activeOpacity={0.7}
              >
                <Text style={styles.submitButtonText}>
                  {filledFields === 0 ? 'Fill at least one field' : 'Submit Contribution'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
          </PanGestureHandler>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: APP_COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 8,
  },
  modalContent: {
    padding: 24,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  xpBanner: {
    backgroundColor: APP_COLORS.accent + '20',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  xpText: {
    fontSize: 20,
    fontWeight: '700',
    color: APP_COLORS.accent,
    marginBottom: 4,
  },
  xpSubtext: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
  },
  form: {
    marginBottom: 24,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: APP_COLORS.text,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  rewardsPreview: {
    backgroundColor: APP_COLORS.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  rewardsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 12,
  },
  rewardsList: {
    gap: 8,
  },
  rewardItem: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  skipButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.textSecondary,
  },
  submitButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: APP_COLORS.accent,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: APP_COLORS.border,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.white,
  },
});
