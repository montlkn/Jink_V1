import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedProps, withTiming } from "react-native-reanimated";
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Stop, Text as SvgText } from "react-native-svg";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { APP_COLORS } from "@/constants/appColors";

const SIZE = 290;
const SVG_PAD = 40;
const CONTAINER_SIZE = SIZE + SVG_PAD * 2;
const HIT_AREA_PADDING = 40; 
const HIT_AREA_SIZE = CONTAINER_SIZE + HIT_AREA_PADDING * 2;
const CENTER = SIZE / 2;
const STROKE_WIDTH = 45; // Wide track to accommodate details
const RADIUS = CENTER - STROKE_WIDTH / 2 - 10;
const HIT_AREA_CENTER = HIT_AREA_SIZE / 2;

// Omega Geometry
const START_ANGLE_DEG = 30;
const END_ANGLE_DEG = -30;
const ARC_SPAN = 300;

// Zone definitions relative to 0-100 range
// 5-10: 1.0x (Cyan)
// 10-15: 1.2x (Orange)
// 15-25: 1.5x (Green)
// 25-40: 2.0x (Red)
// 40-50: 1.2x (Orange)
// 50-60: 1.5x (Green)
// 60-70: 2.0x (Red)
// 70-80: 1.5x (Green)
// 80-85: 1.2x (Orange)
// 85-90: 1.0x (Cyan)
// 90-95: 2.0x (Red)

const ZONES = [
  { min: 5, max: 10,  color: theme.colors.muted, label: "1.0x" }, // Dark Grey
  { min: 10, max: 15, color: APP_COLORS.warning, label: "1.2x" }, // Orange
  { min: 15, max: 25, color: APP_COLORS.success, label: "1.5x" }, // Green
  { min: 25, max: 40, color: APP_COLORS.error, label: "2.0x" }, // Red
  { min: 40, max: 50, color: APP_COLORS.warning, label: "1.2x" }, // Orange
  { min: 50, max: 60, color: APP_COLORS.success, label: "1.5x" }, // Green
  { min: 60, max: 70, color: APP_COLORS.error, label: "2.0x" }, // Red
  { min: 70, max: 80, color: APP_COLORS.success, label: "1.5x" }, // Green
  { min: 80, max: 85, color: APP_COLORS.warning, label: "1.2x" }, // Orange
  { min: 85, max: 90, color: theme.colors.muted, label: "1.0x" }, // Dark Grey
  { min: 90, max: 95, color: APP_COLORS.error, label: "2.0x" }, // Red
];

const angleToPoint = (angleDeg, r = RADIUS) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: CENTER + Math.cos(rad) * r,
    y: CENTER + Math.sin(rad) * r,
  };
};

const getAngleFromTouch = (x, y) => {
  const dx = x - HIT_AREA_CENTER;
  const dy = y - HIT_AREA_CENTER;
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  angle = angle + 90;
  if (angle > 180) angle -= 360;
  if (angle < -180) angle += 360;
  return angle;
};

// Start angle, end angle, radius
const createArcPath = (startAngle, endAngle, radius = RADIUS) => {
  const start = angleToPoint(startAngle, radius);
  const end = angleToPoint(endAngle, radius);
  
  let cwSpan = endAngle - startAngle;
  if (cwSpan < 0) cwSpan += 360;
  
  const largeArc = cwSpan > 180 ? 1 : 0;
  const sweep = 1; 
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
};

const AnimatedPath = Animated.createAnimatedComponent(Path);

const TimeSlider = ({
  min = 5,
  max = 95,
  initialValue = 45,
  setValue,
  onPress,
  color = theme.colors.white,
}) => {
  const range = Math.max(max - min, 1);
  const clampedValue = Math.min(max, Math.max(min, initialValue ?? min));
  const progress = (clampedValue - min) / range; 

  let rawAngle = START_ANGLE_DEG + progress * ARC_SPAN;
  if (rawAngle > 180) rawAngle -= 360;
  if (rawAngle < -180) rawAngle += 360;
  const currentAngle = rawAngle;
  const thumbPos = angleToPoint(currentAngle);

  // Full unified background groove
  const bgPath = useMemo(() => createArcPath(START_ANGLE_DEG, END_ANGLE_DEG), []);
  
  // Progress overlay
  const progressPath = createArcPath(START_ANGLE_DEG, currentAngle);

  const gestureValueRef = useRef(clampedValue);
  const lastNotifiedValueRef = useRef(Math.round(clampedValue));
  const trackingActiveRef = useRef(false);
  const pressEligibleRef = useRef(false);
  const initialTouchRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    gestureValueRef.current = clampedValue;
    lastNotifiedValueRef.current = Math.round(clampedValue);
  }, [clampedValue]);

  const animatedProps = useAnimatedProps(() => {
    return {
      stroke: withTiming(color, { duration: 150, easing: Easing.out(Easing.ease) }),
    };
  }, [color]);

  const clampValue = useCallback(
    (v) => Math.min(max, Math.max(min, v)),
    [max, min]
  );
  
  const prevAngleRef = useRef(START_ANGLE_DEG + (clampedValue - min) / range * ARC_SPAN);

  const angleToValue = useCallback(
    (angle, prevAngle) => {
      let clampedAngle = angle;
      if (angle > END_ANGLE_DEG && angle < START_ANGLE_DEG) {
        let prevFromStart = prevAngle - START_ANGLE_DEG;
        if (prevFromStart < 0) prevFromStart += 360;
        if (prevFromStart < ARC_SPAN / 2) {
          clampedAngle = START_ANGLE_DEG;
        } else {
          clampedAngle = END_ANGLE_DEG;
        }
      }
      
      let angleFromStart = clampedAngle - START_ANGLE_DEG;
      if (angleFromStart < 0) {
        angleFromStart += 360;
      }
      
      const angleProgress = angleFromStart / ARC_SPAN;
      return { value: min + angleProgress * range, clampedAngle };
    },
    [min, range]
  );

  const updateFromAngle = useCallback(
    (angle, notify = true) => {
      const { value: rawValue, clampedAngle } = angleToValue(angle, prevAngleRef.current);
      const clamped = clampValue(rawValue);
      gestureValueRef.current = clamped;
      prevAngleRef.current = clampedAngle;
      const rounded = Math.round(clamped);
      
      if (rounded !== lastNotifiedValueRef.current) {
        if (trackingActiveRef.current) {
          try {
            if (rounded % 15 === 0) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } else if (rounded % 5 === 0) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          } catch (_e) {}
        }
        lastNotifiedValueRef.current = rounded;
        if (notify && setValue) {
          setValue(rounded);
        }
      }
    },
    [angleToValue, clampValue, setValue]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          const dx = locationX - HIT_AREA_CENTER;
          const dy = locationY - HIT_AREA_CENTER;
          const distance = Math.hypot(dx, dy);

          initialTouchRef.current = { x: locationX, y: locationY };
          const ORB_RADIUS = 95;
          const isInCenter = distance < ORB_RADIUS;
          const isOnTrack = !isInCenter;

          trackingActiveRef.current = isOnTrack;
          pressEligibleRef.current = isInCenter;

          if (isOnTrack) {
            const angle = getAngleFromTouch(locationX, locationY);
            updateFromAngle(angle);
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch (_e) {}
          } else if (isInCenter) {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch (_e) {}
          }
        },
        onPanResponderMove: (event) => {
          if (!trackingActiveRef.current) {
            if (pressEligibleRef.current) {
              const dx = event.nativeEvent.locationX - initialTouchRef.current.x;
              const dy = event.nativeEvent.locationY - initialTouchRef.current.y;
              if (Math.hypot(dx, dy) > 16) {
                pressEligibleRef.current = false;
              }
            }
            return;
          }
          const angle = getAngleFromTouch(
            event.nativeEvent.locationX,
            event.nativeEvent.locationY
          );
          updateFromAngle(angle);
        },
        onPanResponderRelease: () => {
          if (pressEligibleRef.current && onPress) {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            } catch (_e) {}
            onPress();
          }
          trackingActiveRef.current = false;
          pressEligibleRef.current = false;
        },
        onPanResponderTerminationRequest: () => true,
        onPanResponderTerminate: () => {
          trackingActiveRef.current = false;
          pressEligibleRef.current = false;
        },
      }),
    [onPress, updateFromAngle]
  );

  // Render colored zones inside the groove
  const renderZones = () => {
    return ZONES.map((zone, i) => {
      // Calculate start and end angles for this zone
      const range = max - min;
      const startProg = Math.max(0, (zone.min - min) / range);
      const endProg = Math.min(1, (zone.max - min) / range);
      
      const startA = START_ANGLE_DEG + startProg * ARC_SPAN;
      const endA = START_ANGLE_DEG + endProg * ARC_SPAN;
      
      // Handle wrapping if needed (though our range is < 360)
      let s = startA;
      let e = endA;
      if (s > 180) s -= 360;
      if (e > 180) e -= 360;
      
      const path = createArcPath(s, e);
      // Determine label pos (midpoint)
      const midProg = (startProg + endProg) / 2;
      const midA = START_ANGLE_DEG + midProg * ARC_SPAN;
      let midWrapped = midA;
      if (midWrapped > 180) midWrapped -= 360;
      const labelPos = angleToPoint(midWrapped, RADIUS + 32); // Push label outside track

      return (
        <G key={`zone-${i}`}>
          {/* Zone segment background */}
          <Path
            d={path}
            stroke={zone.color}
            strokeWidth={STROKE_WIDTH - 12} // Slightly inside main groove
            strokeOpacity={0.15} // Subtle tint
            strokeLinecap="butt"
            fill="none"
          />
          {/* Zone divider line */}
          {i > 0 && (
             <Path
               d={`M ${angleToPoint(s, RADIUS - STROKE_WIDTH/2).x} ${angleToPoint(s, RADIUS - STROKE_WIDTH/2).y} L ${angleToPoint(s, RADIUS + STROKE_WIDTH/2).x} ${angleToPoint(s, RADIUS + STROKE_WIDTH/2).y}`}
               stroke={theme.colors.black + '1A'}
               strokeWidth={1}
             />
          )}

          {/* Label if zone is large enough */}
          {(zone.max - zone.min) >= 5 && (
            <SvgText
              x={labelPos.x}
              y={labelPos.y}
              fill={theme.colors.black + '66'}
              fontSize="10"
              fontWeight="bold"
              textAnchor="middle"
              alignmentBaseline="middle"
              rotation={midWrapped - 90}
              origin={`${labelPos.x}, ${labelPos.y}`}
            >
              {zone.label}
            </SvgText>
          )}
        </G>
      );
    });
  };

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.hitArea} {...panResponder.panHandlers}>
        <View style={styles.circleContainer}>
          <Svg
            width={CONTAINER_SIZE}
            height={CONTAINER_SIZE}
            style={StyleSheet.absoluteFill}
          >
            <Defs>
              <RadialGradient id="grooveInnerShadow" cx="0.5" cy="0.5">
                 <Stop offset="0.8" stopColor={theme.colors.black + '0D'} />
                 <Stop offset="1" stopColor={theme.colors.black + '33'} />
              </RadialGradient>
              <LinearGradient id="knobMetal" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={theme.colors.white} />
                <Stop offset="0.5" stopColor={theme.colors.border} />
                <Stop offset="1" stopColor={theme.colors.border} />
              </LinearGradient>
            </Defs>

            <G transform={`translate(${SVG_PAD}, ${SVG_PAD})`}>
              {/* Outer Shadow Lip (Top/Left dark) */}
              <Path
                d={bgPath}
                stroke={theme.colors.black + '4D'}
                strokeWidth={STROKE_WIDTH + 4}
                strokeLinecap="round"
                fill="none"
              />
               {/* Outer Highlight Lip (Bottom/Right light) */}
               <Path
                d={bgPath}
                stroke={theme.colors.white + 'B3'}
                strokeWidth={STROKE_WIDTH + 4}
                strokeLinecap="round"
                fill="none"
                transform="translate(1, 1)"
              />

              {/* Main Groove Body */}
              <Path
                d={bgPath}
                stroke={theme.colors.surface} // Base track color
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                fill="none"
              />

              {/* Inner Shadow (Groove depth) */}
              <Path
                d={bgPath}
                stroke={theme.colors.black + '26'} // Darker inside
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                fill="none"
              />

              {/* Zone Indicators Layer */}
              {renderZones()}

              {/* Progress Fill Indicator */}
              <AnimatedPath
                d={progressPath}
                animatedProps={animatedProps}
                strokeWidth={STROKE_WIDTH - 6} // Inside groove
                strokeLinecap="round"
                fill="none"
                opacity={0.9}
              />
              
              {/* Glossy overlay on progress for "glass/liquid" look inside groove */}
              <AnimatedPath
                 d={progressPath}
                 stroke={theme.colors.white + '4D'}
                 strokeWidth={STROKE_WIDTH/2}
                 strokeLinecap="round"
                 fill="none"
                 transform="translate(-2, -2)"
              />

              {/* Refined Tactile Knob */}
              <G>
                 {/* Knob Shadow */}
                 <Circle
                  cx={thumbPos.x}
                  cy={thumbPos.y + 4}
                  r={22}
                  fill={theme.colors.black + '33'}
                  opacity={0.6}
                 />
                 {/* Knob Body */}
                 <Circle
                  cx={thumbPos.x}
                  cy={thumbPos.y}
                  r={22}
                  fill="url(#knobMetal)"
                 />
                 {/* Knob Ring Reflection */}
                 <Circle
                   cx={thumbPos.x}
                   cy={thumbPos.y}
                   r={22}
                   fill="none"
                   stroke={theme.colors.white + 'CC'}
                   strokeWidth={1.5}
                 />
                  {/* Center Dimple */}
                 <Circle
                   cx={thumbPos.x}
                   cy={thumbPos.y}
                   r={6}
                   fill={theme.colors.black + '1A'} // Recessed dimple
                   stroke={theme.colors.white + '80'} // Highlight bottom edge of dimple
                   strokeWidth={1}
                 />
              </G>
            </G>
          </Svg>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },
  hitArea: {
    width: HIT_AREA_SIZE,
    height: HIT_AREA_SIZE,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "auto",
  },
  circleContainer: {
    width: CONTAINER_SIZE,
    height: CONTAINER_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default React.memo(TimeSlider);
