import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AuraBreakdownModal = ({
  visible,
  segments = [],
  onClose,
  onSelectSegment,
  onViewProfile,
}) => {
  if (!visible) {
    return null;
  }

  const handleViewProfile = () => {
    if (onClose) {
      onClose();
    }
    if (onViewProfile) {
      setTimeout(onViewProfile, 150);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeXButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>

          <Text style={styles.title}>Your Aesthetic Field</Text>
          <Text style={styles.subtitle}>
            These are the strongest energies shaping your aura right now.
          </Text>

          <View style={styles.segmentList}>
            {segments.length === 0 && (
              <Text style={styles.emptyText}>
                Take the quiz to reveal your aesthetic makeup.
              </Text>
            )}

            {segments.map((segment) => (
              <TouchableOpacity
                key={segment.archetype}
                style={styles.segmentRow}
                activeOpacity={0.75}
                onPress={() => onSelectSegment && onSelectSegment(segment)}
              >
                <View style={styles.segmentLeft}>
                  <View
                    style={[
                      styles.colorDot,
                      { backgroundColor: segment.color || '#666' },
                    ]}
                  />
                  <View>
                    <Text style={styles.segmentName}>{segment.name}</Text>
                    <Text style={styles.segmentMeta}>
                      {segment.percentage}% • {segment.score} pts
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            ))}
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
