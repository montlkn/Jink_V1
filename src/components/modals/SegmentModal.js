import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SegmentModal = ({ visible, segment, onClose, onMoreInfo }) => {
  if (!segment) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeXButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>

          <View style={[styles.colorBar, { backgroundColor: segment.color }]} />

          <Text style={styles.archetype}>{segment.name}</Text>

          <Text style={styles.percentage}>{segment.percentage}%</Text>

          <Text style={styles.score}>Score: {segment.score}</Text>

          <TouchableOpacity
            style={styles.moreInfoButton}
            onPress={() => onMoreInfo && onMoreInfo(segment)}
          >
            <Text style={styles.moreInfoButtonText}>More Info</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    marginHorizontal: 30,
    minWidth: 320,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    position: 'relative',
  },
  colorBar: {
    height: 4,
    width: 60,
    borderRadius: 2,
    marginBottom: 20,
  },
  archetype: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 15,
  },
  percentage: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  score: {
    fontSize: 16,
    color: '#666',
    marginBottom: 25,
  },
  closeXButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 8,
    zIndex: 1,
  },
  moreInfoButton: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 35,
    borderRadius: 25,
    marginTop: 5,
  },
  moreInfoButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SegmentModal;