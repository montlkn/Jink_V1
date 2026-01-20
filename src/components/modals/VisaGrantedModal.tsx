import { APP_COLORS } from "@/constants/appColors";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from 'react-native';
import { FlipModal } from './FlipModal';
import { ModalCloseButton } from './ModalCloseButton';

type VisaGrantedModalProps = {
  visible: boolean;
  neighborhood: string;
  borough: string;
  buildingCount: number;
  onClose: () => void;
};

export function VisaGrantedModal({
  visible,
  neighborhood,
  borough,
  buildingCount,
  onClose,
}: VisaGrantedModalProps): JSX.Element {
  return (
    <FlipModal visible={visible} onClose={onClose}>
      <View style={styles.container}>
        {/* Header Badge */}
        <View style={[styles.badge, { backgroundColor: APP_COLORS.passport.visa }]}>
          <Ionicons name="location" size={16} color={theme.colors.background} style={styles.icon} />
          <Text style={styles.badgeText}>VISA GRANTED</Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconSection}>
            <Ionicons name="map" size={56} color={APP_COLORS.passport.visa} />
          </View>

          {/* Neighborhood Name */}
          <Text style={styles.neighborhoodName}>{neighborhood}</Text>
          <Text style={styles.borough}>{borough}</Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Building Count */}
          <View style={styles.statsSection}>
            <Text style={styles.statsLabel}>BUILDINGS EXPLORED</Text>
            <Text style={styles.statsValue}>{buildingCount}</Text>
          </View>

          {/* Poignant Description */}
          <Text style={styles.description}>
            You've become familiar with {neighborhood}. {'\n'}
            This neighborhood is now part of your story.
          </Text>

          {/* Stamp Notice */}
          <View style={styles.stampNotice}>
            <Ionicons name="ribbon" size={16} color={theme.colors.accent} />
            <Text style={styles.stampText}>Rare stamp added to collection</Text>
          </View>
        </View>

        {/* Close Button */}
        <ModalCloseButton onPress={onClose} />
      </View>
    </FlipModal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: APP_COLORS.passport.visa,
    borderRadius: 0,
    padding: 24,
    minHeight: 380,
  },
  badge: {
    position: 'absolute',
    top: -12,
    left: 24,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 6,
  },
  badgeText: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 11,
    fontWeight: '900',
    color: theme.colors.background,
    letterSpacing: 1.5,
  },
  content: {
    marginTop: 24,
    alignItems: 'center',
  },
  iconSection: {
    marginBottom: 16,
  },
  neighborhoodName: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  borough: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 12,
    color: theme.colors.muted,
    letterSpacing: 2,
    marginBottom: 20,
  },
  divider: {
    width: '100%',
    height: 2,
    backgroundColor: theme.colors.border,
    marginBottom: 20,
  },
  statsSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statsLabel: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 10,
    color: theme.colors.muted,
    letterSpacing: 2,
    marginBottom: 6,
  },
  statsValue: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 32,
    fontWeight: '900',
    color: APP_COLORS.passport.visa,
    lineHeight: 32,
  },
  description: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 14,
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    maxWidth: 280,
    fontStyle: 'italic',
  },
  stampNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  stampText: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 12,
    color: theme.colors.accent,
    marginLeft: 8,
    fontWeight: '600',
  },
});
