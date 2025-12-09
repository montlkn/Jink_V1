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
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';

const AestheticAuraSheet = ({
  visible,
  segments = [],
  onClose,
}) => {
  if (!visible) return null;

  const handleViewProfile = () => {
    log.debug('[aura-sheet] Handle view profile');
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

  const onGestureEvent = (event) => {
    const { translationY, velocityY } = event.nativeEvent;
    if (translationY > 100 || (velocityY > 500 && translationY > 50)) {
      onClose();
    }
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
          <PanGestureHandler onGestureEvent={onGestureEvent}>
            <View style={styles.sheetContainer} onStartShouldSetResponder={() => true}>
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                {/* Handle Indicator */}
                <View style={styles.handleContainer}>
                  <View style={styles.handle} />
                </View>

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
                          setTimeout(() => {
                            log.debug('[aura-sheet] archetype tap -> Profile', archetypeName);
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
              </TouchableOpacity>
            </View>
          </PanGestureHandler>
        </TouchableOpacity>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end', // Align to bottom
    alignItems: 'center',
  },
  sheetContainer: {
    backgroundColor: theme.colors.surface,
    padding: 24,
    paddingTop: 12,
    width: Dimensions.get('window').width, // Full width
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    paddingBottom: 40, // Extra padding for bottom safe area appearance
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.muted,
    borderRadius: 2,
    opacity: 0.5,
  },

  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    letterSpacing: 2,
    marginTop: 4,
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
    marginTop: 18,
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
    paddingVertical: 14,
    paddingHorizontal: 16,
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
    paddingVertical: 16,
    alignItems: 'center',
  },
  viewProfileText: {
    color: theme.colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default AestheticAuraSheet;
