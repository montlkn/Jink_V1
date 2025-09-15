import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';

const ArchetypeDetailModal = ({ visible, archetype, onClose }) => {
  if (!archetype) return null;

  const onGestureEvent = (event) => {
    const { translationY, velocityY } = event.nativeEvent;
    
    // Close modal if swiped down significantly or with high velocity
    if (translationY > 100 || (velocityY > 500 && translationY > 50)) {
      onClose();
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PanGestureHandler onGestureEvent={onGestureEvent}>
          <View style={styles.container}>
            <View style={styles.header}>
              {/* Swipe indicator tab */}
              <View style={styles.swipeIndicator} />
              <View style={[styles.colorBar, { backgroundColor: archetype.color }]} />
              <Text style={styles.title}>{archetype.name}</Text>
            </View>

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
        </PanGestureHandler>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    position: 'relative',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  swipeIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#C0C0C0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  colorBar: {
    height: 4,
    width: '100%',
    marginBottom: 16,
    borderRadius: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  conceptText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    fontStyle: 'italic',
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
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  vibeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  qualityItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingRight: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: 12,
  },
  qualityText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    flex: 1,
  },
  urbanText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    fontStyle: 'italic',
  },
  movementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  movementTag: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
  },
  movementText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
});

export default ArchetypeDetailModal;