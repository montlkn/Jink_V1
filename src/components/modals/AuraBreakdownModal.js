import { log } from "@/lib/log";
import { navigate } from "@/navigation/nav";
import { screens } from "@/navigation/routes";
import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ModalCloseButton from './ModalCloseButton';

const AuraBreakdownModal = ({
  visible,
  segments = [],
  onClose,
}) => {
  if (!visible) return null;

  const handleViewProfile = () => {
    log.debug('[aura-modal] Handle view profile');
    if (onClose) onClose();
    setTimeout(() => {
      navigate(screens.Profile);
    }, 150);
  };

  const formatPercent = (num) => {
    if (typeof num !== 'number') return num;
    return `${Math.round(num * 10) / 10}%`;
  };

  const formatPoints = (num) => {
    if (typeof num !== 'number') return num;
    return `${Math.round(num)} PTS`;
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalContainer}>
          <ModalCloseButton onPress={onClose} style={styles.closeButton} />

          <Text style={styles.title}>AESTHETIC AURA</Text>
          <Text style={styles.subtitle}>
            TOP ENERGIES SHAPING YOUR AURA
          </Text>

          <View style={styles.segmentList}>
            {segments.length === 0 ? (
              <Text style={styles.emptyText}>
                TAKE THE QUIZ TO REVEAL YOUR AESTHETIC MAKEUP.
              </Text>
            ) : (
              segments.map((segment, idx) => (
                <TouchableOpacity
                  key={`${segment.name}-${idx}`}
                  style={styles.segmentRow}
                  activeOpacity={0.75}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (onClose) onClose();
                    const archetypeName = segment?.name;
                    if (!archetypeName) return;
                    // Small delay so the modal close animation feels natural
                    setTimeout(() => {
                      log.debug('[aura-modal] archetype tap -> Profile', archetypeName);
                      navigate(screens.Profile, { initialArchetype: archetypeName });
                    }, 150);
                  }}
                >
                  <View style={styles.segmentLeft}>
                    <View
                      style={[styles.colorDot, { backgroundColor: segment.color || theme.colors.muted }]}
                    />
                    <View>
                      <Text style={styles.segmentName}>
                        {segment.name?.toUpperCase()}
                      </Text>
                      <Text style={styles.segmentMeta}>
                        {formatPercent(segment.percentage)} • {formatPoints(segment.score)}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
                </TouchableOpacity>
              ))
            )}
          </View>

          <TouchableOpacity
            style={styles.viewProfileButton}
            activeOpacity={0.85}
            onPress={handleViewProfile}
          >
            <Text style={styles.viewProfileText}>VIEW FULL PROFILE</Text>
          </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(245, 245, 245, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    padding: 24,
    paddingTop: 20,
    width: Math.min(Dimensions.get('window').width * 0.92, 420),
    borderWidth: 2,
    borderRadius: 12,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 0,
  },
  closeButton: {
    position: 'absolute',
    top: -6,
    right: 0,
    zIndex: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    letterSpacing: 2,
    marginTop: 12,
    fontFamily: theme.typography.fontFamily.bold,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 10,
    lineHeight: 14,
    color: theme.colors.muted,
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  segmentList: {
    marginTop: 12,
    marginBottom: 24,
    gap: 12,
  },
  emptyText: {
    fontSize: 12,
    color: theme.colors.muted,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  segmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 12,
  },
  segmentName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.text,
    letterSpacing: 1,
  },
  segmentMeta: {
    fontSize: 10,
    color: theme.colors.muted,
    marginTop: 2,
    fontFamily: 'Courier',
    fontWeight: 'bold',
  },
  viewProfileButton: {
    backgroundColor: theme.colors.text,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  viewProfileText: {
    color: theme.colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default AuraBreakdownModal;
