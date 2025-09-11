import { arc as d3arc, pie as d3pie } from "d3-shape";
import React, { useMemo, useRef, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { getArchetypeInfo } from "../../services/aestheticScoringService";

export default function D3DonutChart({
  data = [],
  size = 200,
  strokeWidth = 30,
  onSegmentPress = null,
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedArchetype, setSelectedArchetype] = useState(null);
  const clickTimer = useRef(null);

  const normalized = useMemo(
    () =>
      (data ?? []).map((item) => ({
        name: item.name || item.archetype,
        archetype: item.archetype,
        value: item.percentage || 0,
        score: item.score || 0,
        color: item.color || "#999999",
        isPrimary: !!item.isPrimary,
        isSecondary: !!item.isSecondary,
      })),
    [data]
  );

  const segments = useMemo(() => {
    if (!normalized.length) return [];
    const radius = size / 2;
    const innerRadius = radius - strokeWidth;
    const outerRadius = radius - 15;

    const pie = d3pie()
      .value((d) => d.value)
      .sort(null)
      .padAngle(0.02);
    const arcGen = d3arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .cornerRadius(3);

    return pie(normalized).map((slice, idx) => ({
      key: `${slice.data.archetype}-${idx}`,
      d: arcGen(slice),
      data: slice.data,
    }));
  }, [normalized, size, strokeWidth]);

  const handleTap = (segData) => {
    // Double-tap detection
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      if (onSegmentPress) onSegmentPress(segData);
      return;
    }
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      const info = getArchetypeInfo(segData.archetype);
      setSelectedArchetype({
        ...segData,
        description: info?.description || "",
        vibe: info?.vibe || [],
      });
      setModalVisible(true);
    }, 250);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedArchetype(null);
  };

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, backgroundColor: "transparent" },
      ]}
    >
      <Svg width={size} height={size}>
        <G transform={`translate(${size / 2}, ${size / 2})`}>
          {segments.map((seg) => {
            let stroke = "#ffffff";
            let strokeW = 1;
            if (seg.data.isPrimary) {
              stroke = "#000000";
              strokeW = 3;
            } else if (seg.data.isSecondary) {
              stroke = "#333333";
              strokeW = 2;
            }
            return (
              <G key={seg.key} onPress={() => handleTap(seg.data)}>
                <Path
                  d={seg.d}
                  fill={seg.data.color}
                  stroke={stroke}
                  strokeWidth={strokeW}
                />
              </G>
            );
          })}
        </G>
      </Svg>

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
              {onSegmentPress && selectedArchetype ? (
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
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    maxWidth: "80%",
    shadowColor: "#000",
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
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#000",
  },
  modalPercentage: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    textAlign: "center",
    color: "#666",
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonContainer: { flexDirection: "row", gap: 12 },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  closeButtonText: { fontSize: 14, color: "#333", fontWeight: "500" },
  detailButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: "#000",
    borderRadius: 8,
  },
  detailButtonText: { fontSize: 14, color: "#fff", fontWeight: "500" },
});
