import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import ModalCloseButton from './ModalCloseButton';

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
          <ModalCloseButton onPress={onClose} style={styles.closeButton} />

          <View style={[styles.colorBar, { backgroundColor: segment.color }]} />

          <Text style={styles.archetype}>{segment.name}</Text>

          <Text style={styles.percentage}>{segment.percentage}%</Text>

          <Text style={styles.score}>Score: {segment.score}</Text>

          <TouchableOpacity
            style={styles.moreInfoButton}
            onPress={() => onMoreInfo && onMoreInfo(segment)}
          >
            <Text style={styles.moreInfoButtonText}>MORE INFO</Text>
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
    backgroundColor: theme.colors.surface,
    borderRadius: 0,
    padding: 24,
    alignItems: 'center',
    marginHorizontal: 30,
    minWidth: 300,
    borderWidth: 2,
    borderColor: theme.colors.border,
    position: 'relative',
  },
  colorBar: {
    height: 4,
    width: 60,
    marginBottom: 20,
  },
  archetype: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1,
    fontFamily: 'Courier',
    textTransform: 'uppercase',
  },
  percentage: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
    fontFamily: 'Courier',
  },
  score: {
    fontSize: 12,
    color: theme.colors.muted,
    marginBottom: 24,
    fontFamily: 'Courier',
    textTransform: 'uppercase',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    zIndex: 1,
  },
  moreInfoButton: {
    backgroundColor: theme.colors.background,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 0,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.text,
  },
  moreInfoButtonText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    fontFamily: 'Courier',
  },
});

export default SegmentModal;