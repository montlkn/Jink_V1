import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedProps, withTiming } from "react-native-reanimated";
import Svg, { Circle, G, Path } from "react-native-svg";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";

const SIZE = 290;
const SVG_PAD = 40;
const CONTAINER_SIZE = SIZE + SVG_PAD * 2;
const HIT_AREA_PADDING = 40;
const HIT_AREA_SIZE = CONTAINER_SIZE + HIT_AREA_PADDING * 2;
const CENTER = SIZE / 2;
const STROKE_WIDTH = 22;
const RADIUS = CENTER - STROKE_WIDTH / 2 - 18;
const HIT_AREA_CENTER = HIT_AREA_SIZE / 2;

// Omega Geometry
const START_ANGLE_DEG = 30;
const END_ANGLE_DEG = -30;
const ARC_SPAN = 300;

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

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.hitArea} {...panResponder.panHandlers}>
        <View style={styles.circleContainer}>
          <Svg
            width={CONTAINER_SIZE}
            height={CONTAINER_SIZE}
            style={StyleSheet.absoluteFill}
          >
            <G transform={`translate(${SVG_PAD}, ${SVG_PAD})`}>
              {/* 1. Track background */}
              <Path
                d={bgPath}
                stroke={theme.colors.black + '18'}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                fill="none"
              />
              {/* 2. Progress fill — animated color */}
              <AnimatedPath
                d={progressPath}
                animatedProps={animatedProps}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                fill="none"
                opacity={0.95}
              />
              {/* 3. Knob */}
              <G>
                {/* Drop shadow */}
                <Circle cx={thumbPos.x} cy={thumbPos.y + 3} r={13} fill={theme.colors.black + '22'} />
                {/* Knob body */}
                <Circle cx={thumbPos.x} cy={thumbPos.y} r={13} fill={theme.colors.white} />
                {/* Subtle border */}
                <Circle cx={thumbPos.x} cy={thumbPos.y} r={13} fill="none" stroke={theme.colors.black + '14'} strokeWidth={1} />
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
