import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { navigate } from "@/navigation/nav";
import { screens } from "@/navigation/routes";
import { log } from "@/lib/log";

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
    return `${Math.round(num)} pts`;
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeXButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>

          <Text style={styles.title}>Your Aesthetic Aura</Text>
          <Text style={styles.subtitle}>
            These are the top aesthetic energies shaping your aura.
          </Text>

          <View style={styles.segmentList}>
            {segments.length === 0 ? (
              <Text style={styles.emptyText}>
                Take the quiz to reveal your aesthetic makeup.
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
                      style={[styles.colorDot, { backgroundColor: segment.color || '#666' }]}
                    />
                    <View>
                      <Text style={styles.segmentName}>
                        {segment.name?.charAt(0).toUpperCase() + segment.name?.slice(1)}
                      </Text>
                      <Text style={styles.segmentMeta}>
                        {formatPercent(segment.percentage)} • {formatPoints(segment.score)}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              ))
            )}
          </View>

          <TouchableOpacity
            style={styles.viewProfileButton}
            activeOpacity={0.85}
            onPress={handleViewProfile}
          >
            <Text style={styles.viewProfileText}>View Full Profile</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 38,
    paddingBottom: 26,
    width: '82%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 10,
    position: 'relative',
  },
  closeXButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    textAlign: 'center',
  },
  segmentList: {
    marginTop: 28,
    marginBottom: 24,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F5F5F7',
  },
  segmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  segmentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    textTransform: 'capitalize',
  },
  segmentMeta: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  viewProfileButton: {
    backgroundColor: '#111',
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
  },
  viewProfileText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AuraBreakdownModal;
