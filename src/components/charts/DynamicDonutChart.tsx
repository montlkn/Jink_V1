import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import {
  Canvas,
  Path,
  Skia,
  Text,
  useFont,
  Group,
} from "@shopify/react-native-skia";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";

// Font for the chart
const FONT_REGULAR = require("../../../assets/fonts/SpaceMono-Regular.ttf");

type ChartData = {
  value: number;
  color: string;
  label: string;
  percentage?: number; // Pre-calculated percentage (0-100)
};

type Props = {
  data: ChartData[];
  size: number;
  thickness?: number;
};

// Helpers
const polarToCartesian = (
  centerX: number,
  centerY: number,
  radius: number,
  angleInRadians: number
) => {
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const DynamicDonutChart: React.FC<Props> = ({
  data,
  size,
  thickness = 40,
}) => {
  const font = useFont(FONT_REGULAR, 10);
  const fontBold = useFont(FONT_REGULAR, 12);

  // Add padding for labels so they don't get clipped
  const padding = 40; 
  const availableSize = size - (padding * 2);
  const radius = availableSize / 2;
  const innerRadius = radius - thickness;
  const center = { x: size / 2, y: size / 2 };

  // 1. Prepare data slices
  const slices = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return [];

    let currentAngle = -Math.PI / 2; // Start at top

    return data.map((item) => {
      const percentage = item.value / total;
      const sweepAngle = percentage * Math.PI * 2;
      const startAngle = currentAngle;
      const endAngle = startAngle + sweepAngle;
      const midAngle = startAngle + sweepAngle / 2;
      
      currentAngle = endAngle;

      // Create a path for the slice (donut segment)
      const path = Skia.Path.Make();
      
      // We draw the shape by moving to outer arc start, arc to outer end, 
      // line to inner end, arc to inner start (reverse), close.
      const pOuterStart = polarToCartesian(center.x, center.y, radius, startAngle);
      const pInnerEnd = polarToCartesian(center.x, center.y, innerRadius, endAngle);

      path.moveTo(pOuterStart.x, pOuterStart.y);
      path.arcTo(
         { x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2 },
         (startAngle * 180) / Math.PI,
         (sweepAngle * 180) / Math.PI,
         false
      );
      path.lineTo(pInnerEnd.x, pInnerEnd.y);
      path.arcTo(
         { x: center.x - innerRadius, y: center.y - innerRadius, width: innerRadius * 2, height: innerRadius * 2 },
         (endAngle * 180) / Math.PI,
         -(sweepAngle * 180) / Math.PI, // Negative sweep for reverse direction
         false
      );
      path.close();

      return {
        ...item,
        path,
        percentageValue: Math.round(percentage * 100),
        midAngle,
        isSmall: percentage < 0.10, // Threshold for callout (10%)
      };
    });
  }, [data, radius, innerRadius, center]);

  if (!font || !fontBold) {
    return <View style={{ width: size, height: size }} />;
  }

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={StyleSheet.absoluteFill}>
        {slices.map((slice, i) => (
          <Group key={i}>
            <Path
              path={slice.path}
              color={slice.color}
              style="fill"
            />
            {/* Clean white separator */}
            <Path
              path={slice.path}
              color={theme.colors.background}
              style="stroke"
              strokeWidth={2}
            />
          </Group>
        ))}

        {/* Labels & Callouts */}
        {slices.map((slice, i) => {
            const labelText = `${slice.percentageValue}%`;
            const textWidth = fontBold.getTextWidth(labelText);
            const textHeight = fontBold.getMetrics().ascent; // Approximate height (negative)

            if (slice.isSmall) {
                // Render callout
                const lineStartRadius = radius + 2;
                const lineEndRadius = radius + 15;
                const labelRadius = lineEndRadius + 5;
                
                const pStart = polarToCartesian(center.x, center.y, lineStartRadius, slice.midAngle);
                const pEnd = polarToCartesian(center.x, center.y, lineEndRadius, slice.midAngle);
                
                // Determine horizontal direction based on angle
                // If angle is on the left side (90 to 270 degrees), go left
                const isLeft = Math.cos(slice.midAngle) < 0;
                const pHorzEnd = { x: pEnd.x + (isLeft ? -20 : 20), y: pEnd.y };

                // Path for the callout line
                const linePath = Skia.Path.Make();
                linePath.moveTo(pStart.x, pStart.y);
                linePath.lineTo(pEnd.x, pEnd.y);
                linePath.lineTo(pHorzEnd.x, pHorzEnd.y);

                return (
                    <Group key={`label-${i}`}>
                        <Path
                            path={linePath}
                            color={theme.colors.text}
                            style="stroke"
                            strokeWidth={1}
                        />
                        <Text
                            x={pHorzEnd.x + (isLeft ? -textWidth - 6 : 6)}
                            y={pHorzEnd.y + 4}
                            text={labelText}
                            font={fontBold}
                            color={theme.colors.text}
                        />
                    </Group>
                );
            } else {
                // Render centered percentage inside the slice
                const labelPos = polarToCartesian(center.x, center.y, radius - thickness / 2, slice.midAngle);
                return (
                    <Text
                        key={`label-${i}`}
                        x={labelPos.x - textWidth / 2}
                        y={labelPos.y + (-textHeight / 2) - 4} // Center vertically-ish
                        text={labelText}
                        font={fontBold}
                        color={theme.colors.white} // White text on colored background
                    />
                );
            }
        })}
      </Canvas>
    </View>
  );
};

export default DynamicDonutChart;
