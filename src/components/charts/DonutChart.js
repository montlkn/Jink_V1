import * as d3 from "d3";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { G, Path, Text as SvgText, TSpan } from "react-native-svg";

const DonutChart = ({
  data,
  size = 300,
  showLabels = true,
  showTitle = false,
  strokeWidth,
  onSegmentPress,
  hideMoreDetails = false,
  centerText = null,
  showLeaderLabels = false,
}) => {
  const margin = { top: 24, right: 24, bottom: 24, left: 24 };
  const chartWidth = size - margin.left - margin.right;
  const chartHeight = size - margin.top - margin.bottom;
  const radius = Math.min(chartWidth, chartHeight) / 2;
  const halfWidth = chartWidth / 2;
  const halfHeight = chartHeight / 2;

  const pie = d3
    .pie()
    .value(d => d.value)
    .sort(null);

  const innerRadiusRatio = strokeWidth ? 0.5 : 0.4;
  const outerRadiusRatio = strokeWidth ? 0.78 : 0.78;

  const arc = d3
    .arc()
    .innerRadius(radius * innerRadiusRatio)
    .outerRadius(radius * outerRadiusRatio);

  const outerArc = d3
    .arc()
    .innerRadius(radius * 0.88)
    .outerRadius(radius * 0.88);

  const pieData = pie(data);

  const sortedData = [...data].sort((a, b) => b.score - a.score);
  const labeledArchetypes = showLeaderLabels
    ? data.map(d => d.name)
    : sortedData.slice(0, 3).map(d => d.name);

  const getSliceTextPosition = d => arc.centroid(d);

  const formatPercentage = value => `${Math.round(value)}%`;

  return (
    <View style={styles.container}>
      {showTitle && (
        <Text style={styles.title}>Design Archetype Distribution</Text>
      )}

      <Svg width={size} height={size} style={styles.svg}>
        <G
          translateX={chartWidth / 2 + margin.left}
          translateY={chartHeight / 2 + margin.top}
        >
          {pieData.map((d, index) => {
            const pathData = arc(d);
            const isLabeled =
              showLabels && labeledArchetypes.includes(d.data.name);
            const sliceTextPos = getSliceTextPosition(d);
            const lineStart = arc.centroid(d);
            const arcOuter = outerArc.centroid(d);
            const midAngle = (d.startAngle + d.endAngle) / 2;
            const isRightSide = midAngle < Math.PI;
            const isTopHalf = arcOuter[1] <= 0;
            const paddingX = 32;
            const paddingY = 18;
            const baseDiagLength = radius * 0.35;
            const maxHorizontal = isRightSide
              ? halfWidth - paddingX - arcOuter[0]
              : arcOuter[0] + halfWidth - paddingX;
            const topBoundary = -halfHeight + paddingY;
            const bottomBoundary = halfHeight - paddingY;
            const maxVertical = isTopHalf
              ? arcOuter[1] - topBoundary
              : bottomBoundary - arcOuter[1];
            const maxDiagByX = Math.max(0, maxHorizontal) * Math.SQRT2;
            const maxDiagByY = Math.max(0, maxVertical) * Math.SQRT2;
            const diagLength = Math.max(
              0,
              Math.min(baseDiagLength, maxDiagByX, maxDiagByY)
            );
            const step = diagLength / Math.SQRT2;
            const dx = (isRightSide ? 1 : -1) * step;
            const dy = (isTopHalf ? -1 : 1) * step;
            const labelPoint = [arcOuter[0] + dx, arcOuter[1] + dy];
            const leaderPath = `M${lineStart[0]},${lineStart[1]} L${arcOuter[0]},${arcOuter[1]} L${labelPoint[0]},${labelPoint[1]}`;

            return (
              <G key={index}>
                <Path
                  d={pathData}
                  fill={d.data.color}
                  stroke="white"
                  strokeWidth={3}
                  opacity={0.9}
                  onPress={() => onSegmentPress && onSegmentPress(d.data)}
                />

                {isLabeled && !hideMoreDetails && !showLeaderLabels && (
                  <SvgText
                    x={sliceTextPos[0]}
                    y={sliceTextPos[1]}
                    fontSize={14}
                    fontWeight="bold"
                    fill="#000"
                    textAnchor="middle"
                    dy="0.35em"
                  >
                    {d.data.percentage}%
                  </SvgText>
                )}

                {isLabeled && showLeaderLabels && (
                  <G>
                    <Path
                      d={leaderPath}
                      fill="none"
                      stroke={d.data.color}
                      strokeWidth={1.5}
                    />
                    <SvgText
                      x={labelPoint[0] + (isRightSide ? 4 : -4)}
                      y={labelPoint[1] - 6}
                      fontSize={12}
                      fontWeight="600"
                      fill="#111"
                      textAnchor={isRightSide ? "start" : "end"}
                    >
                      {d.data.name}
                      <TSpan
                        x={labelPoint[0] + (isRightSide ? 4 : -4)}
                        dy={16}
                        fontSize={11}
                        fontWeight="400"
                        fill="#555"
                      >
                        {formatPercentage(d.data.percentage)}
                      </TSpan>
                    </SvgText>
                  </G>
                )}
              </G>
            );
          })}

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
                  x={0}
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
                  x={0}
                  y={20}
                  fontSize={10}
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
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    textAlign: "center",
    marginBottom: 20,
  },
  svg: {},
});

export default DonutChart;
