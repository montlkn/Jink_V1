import * as d3 from 'd3';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');

const DonutChart = ({
  data,
  size = 300,
  showLabels = true,
  showTitle = false,
  strokeWidth,
  onSegmentPress,
  hideMoreDetails = false,
  centerText = null
}) => {
  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  const chartWidth = size - margin.left - margin.right;
  const chartHeight = size - margin.top - margin.bottom;
  const radius = Math.min(chartWidth, chartHeight) / 2;

  // Create pie generator
  const pie = d3.pie()
    .value(d => d.value)
    .sort(null);

  // Create arc generators with dynamic sizing
  const innerRadiusRatio = strokeWidth ? 0.5 : 0.4;
  const outerRadiusRatio = strokeWidth ? 0.8 : 0.8;

  const arc = d3.arc()
    .innerRadius(radius * innerRadiusRatio)
    .outerRadius(radius * outerRadiusRatio);

  const outerArc = d3.arc()
    .innerRadius(radius * 0.9)
    .outerRadius(radius * 0.9);

  // Generate pie data
  const pieData = pie(data);

  // Define which archetypes should have labels (top 3 by score)
  const sortedData = [...data].sort((a, b) => b.score - a.score);
  const labeledArchetypes = sortedData.slice(0, 3).map(d => d.name);

  // Helper function to get text position (on the slice)
  const getSliceTextPosition = (d) => {
    return arc.centroid(d);
  };

  return (
    <View style={styles.container}>
      {showTitle && (
        <Text style={styles.title}>Design Archetype Distribution</Text>
      )}

      <Svg
        width={size}
        height={size}
        style={styles.svg}
      >
        <G
          translateX={chartWidth / 2 + margin.left}
          translateY={chartHeight / 2 + margin.top}
        >
          {pieData.map((d, index) => {
            const pathData = arc(d);
            const isLabeled = showLabels && labeledArchetypes.includes(d.data.name);
            const sliceTextPos = getSliceTextPosition(d);

            return (
              <G key={index}>
                {/* Slice path */}
                <Path
                  d={pathData}
                  fill={d.data.color}
                  stroke="white"
                  strokeWidth={3}
                  opacity={0.9}
                  onPress={() => onSegmentPress && onSegmentPress(d.data)}
                  onPressIn={() => {
                    // Add visual feedback for press
                  }}
                />

                {/* Text label on slice for top 3 - only show if not hideMoreDetails */}
                {isLabeled && !hideMoreDetails && (
                  <SvgText
                    x={sliceTextPos[0]}
                    y={sliceTextPos[1]}
                    fontSize={14}
                    fontWeight="bold"
                    fill="black"
                    textAnchor="middle"
                    dy="0.35em"
                  >
                    {d.data.percentage}%
                  </SvgText>
                )}
              </G>
            );
          })}

          {/* Center text */}
          {centerText && (
            <G>
              <SvgText
                x={0}
                y={-15}
                fontSize={16}
                fontWeight="bold"
                fill="#000"
                textAnchor="middle"
                dy="0.35em"
              >
                {centerText.primary}
              </SvgText>
              {centerText.secondary && (
                <SvgText
                  x={-45}
                  y={5}
                  fontSize={10}
                  fill="#666"
                  textAnchor="middle"
                  dy="0.35em"
                >
                  with {centerText.secondary} influences
                </SvgText>
              )}
              {centerText.confidence && (
                <SvgText
                  x={-10}
                  y={20}
                  fontSize={9}
                  fill="#999"
                  textAnchor="middle"
                  dy="0.35em"
                >
                  Confidence: {centerText.confidence}
                </SvgText>
              )}
            </G>
          )}
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 20,
  },
  svg: {
    backgroundColor: 'transparent',
  },
});

export default DonutChart;