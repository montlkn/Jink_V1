import React, { useMemo } from "react";
import { View, Image, StyleSheet } from "react-native";
import {
  Canvas,
  Group,
  Path,
  Text,
  TextPath,
  useFont,
  MaskFilter,
  BlurStyle,
  Skia,
} from "@shopify/react-native-skia";

import { getArchetypeColorSafe } from "@/constants/archetypeColors";

type SliceDatum = {
  id: string;
  value: number;
  label?: string;
  color?: string;
  percentageLabel?: string;
};

type DecoratorConfig = {
  uri: string;
  size?: number;
};

type Props = {
  data: SliceDatum[];
  size?: number;
  highlightCount?: number;
  centerGlowColor?: string;
  decorator?: DecoratorConfig;
};

type ComputedSlice = SliceDatum & {
  startAngle: number;
  endAngle: number;
  sweep: number;
  color: string;
  label: string;
  percentageLabel: string;
  isHighlighted: boolean;
};

const DEFAULT_SIZE = 420;
const LABEL_FONT_RATIO = 0.065;
const PERCENT_FONT_RATIO = 0.055;
const OUTER_TO_FILL_OFFSET_RATIO = 0.05; // 0.05"
const INNER_RADIUS_OFFSET_RATIO = 0.8; // outerRadius - innerRadius = 0.8" -> inner radius ratio 0.2
const OUTER_RIM_THICKNESS_RATIO = 0.018;
const INNER_RIM_THICKNESS_RATIO = 0.028;
const SHADOW_BLUR_PX = 3;
const SHADOW_OPACITY = 0.5;

const LABEL_FONT_PATH = require("../../../assets/fonts/Jacquard12-Regular.ttf");

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const polarToCartesian = (radius: number, angle: number) => ({
  x: radius * Math.cos(angle),
  y: radius * Math.sin(angle),
});

const radiansToDegrees = (radians: number) => (radians * 180) / Math.PI;

const sanitizeLabel = (raw: string | undefined, fallback: string) => {
  if (typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  return trimmed.length ? trimmed.replace(/\s+/g, " ") : fallback;
};

const createRingSegmentPath = (
  startAngle: number,
  endAngle: number,
  innerRadius: number,
  outerRadius: number
) => {
  const path = Skia.Path.Make();
  const sweep = endAngle - startAngle;
  if (Math.abs(sweep) < 1e-4) return path;

  const outerStart = polarToCartesian(outerRadius, startAngle);
  const outerRect = {
    x: -outerRadius,
    y: -outerRadius,
    width: outerRadius * 2,
    height: outerRadius * 2,
  };
  const innerRect = {
    x: -innerRadius,
    y: -innerRadius,
    width: innerRadius * 2,
    height: innerRadius * 2,
  };

  path.moveTo(outerStart.x, outerStart.y);
  path.arcToOval(outerRect, radiansToDegrees(startAngle), radiansToDegrees(sweep), false);
  const innerEnd = polarToCartesian(innerRadius, endAngle);
  path.lineTo(innerEnd.x, innerEnd.y);
  path.arcToOval(innerRect, radiansToDegrees(endAngle), radiansToDegrees(-sweep), false);
  path.close();

  return path;
};

const createArcPath = (
  startAngle: number,
  endAngle: number,
  radius: number,
  reverse = false
) => {
  const path = Skia.Path.Make();
  const sweep = endAngle - startAngle;
  if (Math.abs(sweep) < 1e-4) return path;

  const rect = {
    x: -radius,
    y: -radius,
    width: radius * 2,
    height: radius * 2,
  };

  if (reverse) {
    const start = polarToCartesian(radius, endAngle);
    path.moveTo(start.x, start.y);
    path.arcToOval(rect, radiansToDegrees(endAngle), radiansToDegrees(startAngle - endAngle), false);
  } else {
    const start = polarToCartesian(radius, startAngle);
    path.moveTo(start.x, start.y);
    path.arcToOval(rect, radiansToDegrees(startAngle), radiansToDegrees(sweep), false);
  }

  return path;
};

const buildSlices = (
  data: SliceDatum[],
  highlightCount: number
): ComputedSlice[] => {
  const sanitized = (Array.isArray(data) ? data : [])
    .filter(slice => typeof slice?.value === "number" && slice.value > 0);

  if (!sanitized.length) {
    return [];
  }

  const total = sanitized.reduce((sum, slice) => sum + slice.value, 0);
  if (total <= 0) {
    return [];
  }

  const topIds = new Set(
    [...sanitized]
      .sort((a, b) => b.value - a.value)
      .slice(0, highlightCount)
      .map(slice => slice.id)
  );

  let currentAngle = -Math.PI / 2;

  return sanitized.map(slice => {
    const sweep = (slice.value / total) * Math.PI * 2;
    const startAngle = currentAngle;
    const endAngle = startAngle + sweep;
    currentAngle = endAngle;

    const id = slice.id || "slice";
    const color = slice.color ?? getArchetypeColorSafe(slice.id);
    const label = sanitizeLabel(slice.label ?? slice.id, id);
    const percentageLabel =
      slice.percentageLabel ??
      `${clamp(Math.round(slice.value), 0, 100)}%`;

    return {
      ...slice,
      id,
      color,
      label,
      percentageLabel,
      startAngle,
      endAngle,
      sweep,
      isHighlighted: topIds.has(id),
    };
  });
};

const ArchetypeDonutSkia: React.FC<Props> = ({
  data,
  size = DEFAULT_SIZE,
  highlightCount = 3,
  centerGlowColor = "#39ff14",
  decorator,
}) => {
  const hasSkiaSupport = Boolean(
    Canvas && Path && Skia?.Path?.Make && typeof Skia.Path.Make === "function"
  );

  if (!hasSkiaSupport) {
    return <View style={{ width: size, height: size }} />;
  }

  const labelFontSize = Math.max(10, size * LABEL_FONT_RATIO);
  const percentFontSize = Math.max(10, size * PERCENT_FONT_RATIO);
  const labelFont = useFont(LABEL_FONT_PATH, labelFontSize);
  const percentFont = useFont(LABEL_FONT_PATH, percentFontSize);

  const slices = useMemo(
    () => buildSlices(data, highlightCount),
    [data, highlightCount]
  );

  const outerRadius = size / 2;
  const fillOuterRadius = outerRadius * (1 - OUTER_TO_FILL_OFFSET_RATIO);
  const innerRadius = outerRadius * (1 - INNER_RADIUS_OFFSET_RATIO);
  const innerGap = outerRadius * INNER_RIM_THICKNESS_RATIO;
  const fillInnerRadius = innerRadius + innerGap;
  const percentTextRadius = innerRadius + innerGap * 0.35;
  const decoratorRadius = outerRadius + outerRadius * 0.03;
  const strokeWidth = outerRadius * OUTER_RIM_THICKNESS_RATIO * 0.6;
  const labelOffset = strokeWidth * 0.8;
  const innerLabelOffset = strokeWidth * 0.65;

  const shadowMask =
    typeof MaskFilter?.MakeBlur === "function" && BlurStyle
      ? MaskFilter.MakeBlur(BlurStyle.Normal, SHADOW_BLUR_PX, true)
      : null;

  if (!slices.length) {
    return <View style={{ width: size, height: size }} />;
  }

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Group transform={[{ translateX: outerRadius }, { translateY: outerRadius }]}>
          {slices.map((slice, index) => {
            const outerArcPath = createArcPath(
              slice.startAngle,
              slice.endAngle,
              outerRadius
            );
            return (
              <Path
                key={`shadow-${slice.id}-${index}`}
                path={outerArcPath}
                color="rgba(0,0,0,1)"
                style="stroke"
                strokeWidth={strokeWidth}
                opacity={SHADOW_OPACITY}
                maskFilter={shadowMask ?? undefined}
              />
            );
          })}

          {slices.map((slice, index) => {
            const segmentPath = createRingSegmentPath(
              slice.startAngle,
              slice.endAngle,
              fillInnerRadius,
              fillOuterRadius
            );

            return (
              <React.Fragment key={`slice-${slice.id}-${index}`}>
                <Path
                  path={segmentPath}
                  color={slice.color}
                  style="fill"
                  opacity={slice.isHighlighted ? 1 : 0.65}
                />
                <Path
                  path={segmentPath}
                  color="#050505"
                  style="stroke"
                  strokeWidth={strokeWidth}
                  strokeJoin="round"
                  opacity={0.95}
                />
              </React.Fragment>
            );
          })}

          {(() => {
            const cutout = Skia.Path.Make();
            cutout.addCircle(0, 0, innerRadius);
            return <Path path={cutout} color="transparent" />;
          })()}

          {(() => {
            const glow = Skia.Path.Make();
            glow.addCircle(0, 0, innerRadius * 1.2);
            const glowMask =
              typeof MaskFilter?.MakeBlur === "function" && BlurStyle
                ? MaskFilter.MakeBlur(BlurStyle.Normal, 10, true)
                : null;
            return (
              <Path
                path={glow}
                style="fill"
                color={centerGlowColor}
                opacity={0.22}
                maskFilter={glowMask ?? undefined}
              />
            );
          })()}

          {labelFont &&
            slices.map((slice, index) => {
              if (slice.sweep < 0.01) return null;
              const midAngle = (slice.startAngle + slice.endAngle) / 2;
              const isLower = midAngle > Math.PI / 2 && midAngle < (3 * Math.PI) / 2;
              const textRadius = isLower
                ? fillOuterRadius - innerLabelOffset
                : fillOuterRadius + labelOffset;
              const path = createArcPath(
                slice.startAngle,
                slice.endAngle,
                textRadius,
                isLower
              );
              if (path.isEmpty()) return null;
              return (
                <TextPath
                  key={`label-${slice.id}-${index}`}
                  text={`${slice.label}`.toUpperCase()}
                  font={labelFont}
                  path={path}
                  color="#000000"
                  horizontalAlign="center"
                />
              );
            })}

          {percentFont &&
            slices.map((slice, index) => {
              if (slice.sweep < 0.01) return null;
              const angle = (slice.startAngle + slice.endAngle) / 2;
              const position = polarToCartesian(percentTextRadius, angle);
              const text = slice.percentageLabel;
              const width = percentFont.getTextWidth(text);
              const metrics = percentFont.getMetrics();
              const ascent = metrics?.ascent ?? percentFontSize * 0.8;
              const baselineOffset = ascent / 2.5;
              return (
                <Text
                  key={`percentage-${slice.id}-${index}`}
                  text={text}
                  font={percentFont}
                  x={position.x - width / 2}
                  y={position.y + baselineOffset}
                  color="#FFFFFF"
                />
              );
            })}
        </Group>
      </Canvas>

      {decorator?.uri ? (
        <Image
          source={{ uri: decorator.uri }}
          style={[
            styles.decorator,
            {
              width: decorator.size ?? 28,
              height: decorator.size ?? 28,
              left: outerRadius + decoratorRadius * Math.cos((3 * Math.PI) / 4) - (decorator.size ?? 28) / 2,
              top: outerRadius + decoratorRadius * Math.sin((3 * Math.PI) / 4) - (decorator.size ?? 28) / 2,
            },
          ]}
        />
      ) : null}
      {decorator?.uri ? (
        <Image
          source={{ uri: decorator.uri }}
          style={[
            styles.decorator,
            {
              width: decorator.size ?? 28,
              height: decorator.size ?? 28,
              left: outerRadius + decoratorRadius * Math.cos((5 * Math.PI) / 4) - (decorator.size ?? 28) / 2,
              top: outerRadius + decoratorRadius * Math.sin((5 * Math.PI) / 4) - (decorator.size ?? 28) / 2,
            },
          ]}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  decorator: {
    position: "absolute",
  },
});

export type { SliceDatum };
export default ArchetypeDonutSkia;
