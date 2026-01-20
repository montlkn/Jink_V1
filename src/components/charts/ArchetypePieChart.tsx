import {
    Canvas,
    Group,
    Path,
    Skia,
    Text,
    useFont,
} from "@shopify/react-native-skia";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { getArchetypeColorSafe } from "@/constants/archetypeColors";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";

type SliceDatum = {
  id: string;
  value: number;
  label?: string;
  color?: string;
  percentageLabel?: string;
};

type Props = {
  data: SliceDatum[];
  size?: number;
};

type ComputedSlice = SliceDatum & {
  startAngle: number;
  endAngle: number;
  color: string;
  label: string;
  percentageLabel: string;
};

const DEFAULT_SIZE = 300;
const LABEL_FONT_RATIO = 0.045; // Smaller for outer labels
const PERCENT_FONT_RATIO = 0.10; // Large pixelated percent

// Assuming this font is available as it was used in the Donut chart
const PIXEL_FONT_PATH = require("../../../assets/fonts/Jacquard12-Regular.ttf");

const polarToCartesian = (radius: number, angle: number) => ({
  x: radius * Math.cos(angle),
  y: radius * Math.sin(angle),
});

const createPieSlicePath = (
  startAngle: number,
  endAngle: number,
  radius: number
) => {
  const path = Skia.Path.Make();
  const center = { x: 0, y: 0 };
  
  // Convert angles to degrees
  const startDeg = (startAngle * 180) / Math.PI;
  const sweepDeg = ((endAngle - startAngle) * 180) / Math.PI;

  // Start at center
  path.moveTo(center.x, center.y);
  
  // Draw line to start of arc
  path.lineTo(
    center.x + radius * Math.cos(startAngle),
    center.y + radius * Math.sin(startAngle)
  );
  
  // Add the arc
  path.addArc(
    { x: -radius, y: -radius, width: radius * 2, height: radius * 2 },
    startDeg,
    sweepDeg
  );
  
  // Close back to center
  path.close();

  return path;
};

const buildSlices = (data: SliceDatum[]): ComputedSlice[] => {
  const sanitized = (Array.isArray(data) ? data : [])
    .filter(slice => typeof slice?.value === "number" && slice.value > 0);

  if (!sanitized.length) return [];

  const total = sanitized.reduce((sum, slice) => sum + slice.value, 0);
  if (total <= 0) return [];

  let currentAngle = -Math.PI / 2; // Start at top

  return sanitized.map(slice => {
    const sweep = (slice.value / total) * Math.PI * 2;
    const startAngle = currentAngle;
    const endAngle = startAngle + sweep;
    currentAngle = endAngle;

    const id = slice.id || "slice";
    const color = slice.color ?? getArchetypeColorSafe(slice.id);
    const label = slice.label ?? slice.id;
    const percentageLabel = slice.percentageLabel ?? `${Math.round((slice.value / total) * 100)}%`;

    return {
      ...slice,
      id,
      color,
      label,
      percentageLabel,
      startAngle,
      endAngle,
    };
  });
};

const ArchetypePieChart: React.FC<Props> = ({
  data,
  size = DEFAULT_SIZE,
}) => {
  const labelFontSize = Math.max(10, size * LABEL_FONT_RATIO);
  const percentFontSize = Math.max(14, size * PERCENT_FONT_RATIO);
  const font = useFont(PIXEL_FONT_PATH, labelFontSize);
  const percentFont = useFont(PIXEL_FONT_PATH, percentFontSize);

  const slices = useMemo(() => buildSlices(data), [data]);

  if (!slices.length) {
    return <View style={{ width: size, height: size }} />;
  }

  const radius = size / 2;
  const labelRadius = radius * 1.15; // Place labels outside
  const percentRadius = radius * 0.65; // Place percent inside

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Group transform={[{ translateX: radius }, { translateY: radius }]}>
          {slices.map((slice, index) => {
            const path = createPieSlicePath(slice.startAngle, slice.endAngle, radius);
            return (
              <Group key={`slice-${index}`}>
                <Path
                  path={path}
                  color={slice.color}
                  style="fill"
                />
                <Path
                  path={path}
                  color={theme.colors.black}
                  style="stroke"
                  strokeWidth={2}
                />
              </Group>
            );
          })}

          {/* Percentages */}
          {percentFont && slices.map((slice, index) => {
            if (slice.endAngle - slice.startAngle < 0.2) return null; // Skip small slices
            const angle = (slice.startAngle + slice.endAngle) / 2;
            const pos = polarToCartesian(percentRadius, angle);
            const text = slice.percentageLabel;
            const width = percentFont.getTextWidth(text);
            const metrics = percentFont.getMetrics();
            const offset = (metrics?.ascent || 0) / 2;

            return (
              <Text
                key={`pct-${index}`}
                x={pos.x - width / 2}
                y={pos.y - offset}
                text={text}
                font={percentFont}
                color={theme.colors.white}
                style="fill"
              />
            );
          })}

          {/* Outer Labels - Fixed positioning without rotation */}
          {font && slices.map((slice, index) => {
            if (slice.endAngle - slice.startAngle < 0.15) return null; // Skip tiny slices
            
            const angle = (slice.startAngle + slice.endAngle) / 2;
            const pos = polarToCartesian(labelRadius, angle);
            const text = slice.label.toUpperCase();
            const width = font.getTextWidth(text);
            const metrics = font.getMetrics();
            const offset = (metrics?.ascent || 0) / 2;

            return (
              <Text
                key={`label-${index}`}
                x={pos.x - width / 2}
                y={pos.y + offset}
                text={text}
                font={font}
                color={theme.colors.black}
                style="fill"
              />
            );
          })}
        </Group>
      </Canvas>
      
      {/* Center White Circle (Donut hole, but small) - Reference has a small white center */}
      <View style={[styles.centerHole, {
          left: radius - (size * 0.15),
          top: radius - (size * 0.15),
          width: size * 0.3,
          height: size * 0.3,
          borderRadius: size * 0.15,
          backgroundColor: theme.colors.white,
          borderWidth: 2,
          borderColor: theme.colors.black
      }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  centerHole: {
    position: "absolute",
    backgroundColor: theme.colors.white,
    borderWidth: 4,
    borderColor: theme.colors.black,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default ArchetypePieChart;
