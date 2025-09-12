import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { getArchetypeInfo } from '../../services/aestheticScoringService';

const DonutChart = ({ data = [], size = 180, strokeWidth = 22, onSegmentPress = null, hideMoreDetails = false }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedArchetype, setSelectedArchetype] = useState(null);

  const normalized = (data ?? []).map((item) => ({
    name: item.name || item.archetype,
    archetype: item.archetype,
    value: item.percentage || 0,
    score: item.score || 0,
    color: item.color || '#999999',
    isPrimary: !!item.isPrimary,
    isSecondary: !!item.isSecondary,
  }));

  const total = normalized.reduce((sum, item) => sum + item.value, 0);

  const handleSegmentPress = (segData) => {
    const info = getArchetypeInfo(segData.archetype);
    setSelectedArchetype({
      ...segData,
      description: info?.description || '',
      vibe: info?.vibe || [],
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedArchetype(null);
  };

  // Create SVG path for donut slice
  const createPath = (startAngle, endAngle, outerRadius, innerRadius) => {
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;
    
    const x1 = Math.cos(startAngleRad) * outerRadius;
    const y1 = Math.sin(startAngleRad) * outerRadius;
    const x2 = Math.cos(endAngleRad) * outerRadius;
    const y2 = Math.sin(endAngleRad) * outerRadius;
    
    const x3 = Math.cos(endAngleRad) * innerRadius;
    const y3 = Math.sin(endAngleRad) * innerRadius;
    const x4 = Math.cos(startAngleRad) * innerRadius;
    const y4 = Math.sin(startAngleRad) * innerRadius;
    
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    
    return [
      'M', x1, y1,
      'A', outerRadius, outerRadius, 0, largeArcFlag, 1, x2, y2,
      'L', x3, y3,
      'A', innerRadius, innerRadius, 0, largeArcFlag, 0, x4, y4,
      'Z'
    ].join(' ');
  };

  const renderSlices = () => {
    if (!normalized.length) return null;
    
    let cumulativeAngle = -90; // Start from top (12 o'clock)
    const outerRadius = size / 2 - 2;
    const innerRadius = outerRadius - strokeWidth;
    
    return normalized.map((item, index) => {
      const percentage = item.value / total;
      const angle = percentage * 360;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + angle;
      
      if (angle < 1) return null; // Skip very small slices
      
      const path = createPath(startAngle, endAngle, outerRadius, innerRadius);
      
      // Get stroke style
      let stroke = '#ffffff';
      let strokeWidthValue = 1;
      if (item.isPrimary) {
        stroke = '#000000';
        strokeWidthValue = 2;
      } else if (item.isSecondary) {
        stroke = '#333333';
        strokeWidthValue = 1.5;
      }
      
      const slice = (
        <Path
          key={`${item.archetype}-${index}`}
          d={path}
          fill={item.color}
          stroke={stroke}
          strokeWidth={strokeWidthValue}
          onPress={() => {
            console.log('SVG Path pressed:', item.name);
            handleSegmentPress(item);
          }}
        />
      );
      
      cumulativeAngle += angle;
      return slice;
    });
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={styles.svgContainer}>
        <Svg 
          width={size} 
          height={size} 
          viewBox={`0 0 ${size} ${size}`}
          style={styles.svg}
        >
          <G transform={`translate(${size / 2}, ${size / 2})`}>
            {renderSlices()}
          </G>
        </Svg>
      </View>
      
      {/* Center content */}
      <View style={[
        styles.centerContent,
        {
          width: (size - strokeWidth * 2),
          height: (size - strokeWidth * 2),
          borderRadius: (size - strokeWidth * 2) / 2,
        }
      ]}>
        <TouchableOpacity onPress={() => onSegmentPress && onSegmentPress()}>
          <Text style={styles.centerText}>
            {Math.round(normalized.find(item => item.isPrimary)?.value || 0)}%
          </Text>
          <Text style={styles.centerSubtext}>
            {normalized.find(item => item.isPrimary)?.name || 'Primary'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeModal}
        >
          <View style={styles.modalContent}>
            <View
              style={[
                styles.colorIndicator,
                { backgroundColor: selectedArchetype?.color },
              ]}
            />
            <Text style={styles.modalTitle}>{selectedArchetype?.name}</Text>
            <Text style={styles.modalPercentage}>
              {selectedArchetype?.value}%
            </Text>
            {selectedArchetype?.description ? (
              <Text style={styles.modalDescription}>
                {selectedArchetype.description}
              </Text>
            ) : null}

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
              {!hideMoreDetails && onSegmentPress && selectedArchetype ? (
                <TouchableOpacity
                  style={styles.detailButton}
                  onPress={() => {
                    closeModal();
                    onSegmentPress?.(selectedArchetype);
                  }}
                >
                  <Text style={styles.detailButtonText}>More Details</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  svgContainer: {
    position: 'relative',
  },
  svg: {
    backgroundColor: 'transparent',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  centerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  centerSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#000',
  },
  modalPercentage: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonContainer: { flexDirection: 'row', gap: 12 },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  closeButtonText: { fontSize: 14, color: '#333', fontWeight: '500' },
  detailButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#000',
    borderRadius: 8,
  },
  detailButtonText: { fontSize: 14, color: '#fff', fontWeight: '500' },
});

export default DonutChart;