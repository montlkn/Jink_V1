import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import ModalCloseButton from './ModalCloseButton';

const ArchetypeDetailModal = ({ visible, archetype, onClose }) => {
  if (!archetype) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <ModalCloseButton onPress={onClose} />
            <Text style={styles.title}>{archetype.name.toUpperCase()}</Text>
            <View style={{ width: 140 }} />
          </View>
          <View style={[styles.colorBar, { backgroundColor: archetype.color }]} />

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Core Concept */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Core Concept</Text>
            <Text style={styles.conceptText}>{archetype.coreConcept}</Text>
          </View>

          {/* The Vibe */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>The Vibe</Text>
            <View style={styles.vibeContainer}>
              {archetype.vibe.map((vibe, index) => (
                <View key={index} style={[styles.vibeTag, { borderColor: archetype.color }]}>
                  <Text style={[styles.vibeText, { color: archetype.color }]}>{vibe}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Core Qualities */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Core Qualities</Text>
            {archetype.coreQualities.map((quality, index) => (
              <View key={index} style={styles.qualityItem}>
                <View style={[styles.bullet, { backgroundColor: archetype.color }]} />
                <Text style={styles.qualityText}>{quality}</Text>
              </View>
            ))}
          </View>

          {/* Urban Expression */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Urban Expression</Text>
            <Text style={styles.urbanText}>{archetype.urbanExpression}</Text>
          </View>

          {/* Umbrella Movements */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Related Movements</Text>
            <View style={styles.movementsContainer}>
              {archetype.umbrellaMovements.map((movement, index) => (
                <View key={index} style={styles.movementTag}>
                  <Text style={styles.movementText}>{movement}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
        </View>
      </View>
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
    width: '85%',
    maxHeight: '80%',
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  colorBar: {
    height: 4,
    width: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    letterSpacing: 1,
    fontFamily: 'Courier',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginVertical: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    backgroundColor: theme.colors.surface,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.muted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'Courier',
  },
  conceptText: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.text,
    fontFamily: 'Courier',
  },
  vibeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vibeTag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 0,
    backgroundColor: theme.colors.background,
  },
  vibeText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    fontFamily: 'Courier',
  },
  qualityItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 0,
    marginTop: 6,
    marginRight: 12,
  },
  qualityText: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.text,
    flex: 1,
    fontFamily: 'Courier',
  },
  urbanText: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.text,
    fontFamily: 'Courier',
  },
  movementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  movementTag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 0,
  },
  movementText: {
    fontSize: 10,
    color: theme.colors.text,
    fontWeight: 'bold',
    fontFamily: 'Courier',
  },
});

export default ArchetypeDetailModal;
