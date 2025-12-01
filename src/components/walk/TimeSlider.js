import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Image, PanResponder, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

const SIZE = 290;
const SVG_PAD = 36; // padding around SVG to prevent label clipping
const CONTAINER_SIZE = SIZE + SVG_PAD * 2;
const CENTER = SIZE / 2;
const STROKE_WIDTH = 15;
const RADIUS = CENTER - STROKE_WIDTH;
const CONTAINER_CENTER = CONTAINER_SIZE / 2;
const TRACK_INNER_RADIUS = RADIUS - STROKE_WIDTH * 0.5;
const PRESS_MOVE_THRESHOLD = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const FULL_ROTATION = 360;

const getPolarFromEvent = ({ locationX, locationY }) => {
  const dx = locationX - CONTAINER_CENTER;
  const dy = locationY - CONTAINER_CENTER;
  const distance = Math.hypot(dx, dy);
  const radians = Math.atan2(dy, dx);
  const degrees = (radians * 180) / Math.PI;
  const angle = (degrees + 90 + FULL_ROTATION) % FULL_ROTATION;
  return { angle, distance };
};

const TimeSlider = ({
  min = 0,
  max = 90,
  initialValue = 0,
  setValue,
  onPress,
  centerLabel = "",
}) => {
  const range = Math.max(max - min, 1);
  const clampedValue = Math.min(max, Math.max(min, initialValue ?? min));
  const progress = (clampedValue - min) / range;
  // const dashOffset = CIRCUMFERENCE * (1 - progress); // No longer needed for SVG background
  const angleRadians = progress * 2 * Math.PI - Math.PI / 2;
  const thumbX = CENTER + Math.cos(angleRadians) * RADIUS;
  const thumbY = CENTER + Math.sin(angleRadians) * RADIUS;

  const lastAngleRef = useRef(progress * FULL_ROTATION);
  const gestureValueRef = useRef(clampedValue);
  const lastNotifiedValueRef = useRef(Math.round(clampedValue));
  const trackingActiveRef = useRef(false);
  const pressEligibleRef = useRef(false);
  const initialTouchRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const angleFromValue = progress * FULL_ROTATION;
    lastAngleRef.current = angleFromValue;
    gestureValueRef.current = clampedValue;
    lastNotifiedValueRef.current = Math.round(clampedValue);
  }, [clampedValue, progress]);

  const clampToRange = useCallback(
    (value) => Math.min(max, Math.max(min, value)),
    [max, min]
  );

  const updateGestureValue = useCallback(
    (rawValue, shouldNotify = true) => {
      const clamped = clampToRange(rawValue);
      gestureValueRef.current = clamped;
      const rounded = Math.round(clamped);
      const hasChanged = rounded !== lastNotifiedValueRef.current;
      if (hasChanged) {
        // Haptic on notch hits while dragging
        if (trackingActiveRef.current) {
          try {
            if (rounded % 15 === 0) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } else if (rounded % 5 === 0) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          } catch (_error) {}
        }
        lastNotifiedValueRef.current = rounded;
        if (shouldNotify && setValue) {
          setValue(rounded);
        }
      }
      return clamped;
    },
    [clampToRange, setValue]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const { angle, distance } = getPolarFromEvent(event.nativeEvent);
          initialTouchRef.current = {
            x: event.nativeEvent.locationX,
            y: event.nativeEvent.locationY,
          };
          const isTracking = distance >= TRACK_INNER_RADIUS;
          trackingActiveRef.current = isTracking;
          pressEligibleRef.current = !isTracking;
          lastAngleRef.current = angle;
          if (isTracking) {
            const rawValue = min + (angle / FULL_ROTATION) * range;
            updateGestureValue(rawValue);
          } else {
            // Immediate haptic feedback for center press
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch (_error) {}
          }
        },
        onPanResponderMove: (event) => {
          if (!trackingActiveRef.current) {
            if (pressEligibleRef.current) {
              const dx =
                event.nativeEvent.locationX - initialTouchRef.current.x;
              const dy =
                event.nativeEvent.locationY - initialTouchRef.current.y;
              if (Math.hypot(dx, dy) > PRESS_MOVE_THRESHOLD) {
                pressEligibleRef.current = false;
              }
            }
            return;
          }
          const { angle } = getPolarFromEvent(event.nativeEvent);
          let delta = angle - lastAngleRef.current;
          if (delta > 180) {
            delta -= 360;
          } else if (delta < -180) {
            delta += 360;
          }
          lastAngleRef.current = angle;
          const currentValue = gestureValueRef.current;
          const rawNext = currentValue + (delta / FULL_ROTATION) * range;
          updateGestureValue(rawNext);
        },
        onPanResponderRelease: () => {
          if (pressEligibleRef.current && onPress) {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            } catch (_error) {}
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
    [min, onPress, range, updateGestureValue]
  );

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.circleContainer} {...panResponder.panHandlers}>
        {/* Background PNG Track */}
        <View style={StyleSheet.absoluteFill}>
          <Image
            source={require("../../../assets/icons/walk/timeslider.png")}
            style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE }}
            resizeMode="contain"
          />
        </View>

        {/* Thumb Overlay */}
        {/* Thumb Overlay */}
        {/* Thumb Overlay */}
        <Svg
          width={CONTAINER_SIZE}
          height={CONTAINER_SIZE}
          style={StyleSheet.absoluteFill}
        >
          <G transform={`translate(${SVG_PAD}, ${SVG_PAD})`}>
            {/* Completion Stroke */}
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              stroke="#FFFFFF"
              strokeWidth={STROKE_WIDTH}
              strokeDasharray={`${CIRCUMFERENCE * progress} ${CIRCUMFERENCE}`}
              strokeDashoffset={0}
              strokeLinecap="butt"
              fill="transparent"
              rotation="-90"
              origin={`${CENTER}, ${CENTER}`}
              opacity={0.6}
            />

            {/* Invisible larger hit area for better touch accuracy */}
            <Circle cx={thumbX} cy={thumbY} r={24} fill="transparent" />
            
            {/* Visual Thumb */}
            <Circle 
              cx={thumbX} 
              cy={thumbY} 
              r={14} 
              fill="#000" 
              stroke="#fff" 
              strokeWidth={2}
              shadowColor="#000"
              shadowOffset={{ width: 0, height: 2 }}
              shadowOpacity={0.3}
              shadowRadius={3}
            />
            <Circle cx={thumbX} cy={thumbY} r={6} fill="#fff" />
          </G>
        </Svg>

        {centerLabel ? (
          <View pointerEvents="none" style={styles.valueContainer}>
            <Text style={styles.valueSubText}>{centerLabel}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },
  circleContainer: {
    width: CONTAINER_SIZE,
    height: CONTAINER_SIZE,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "auto",
  },
  valueContainer: {
    position: "absolute",
    alignItems: "center",
  },
  valueSubText: {
    fontSize: 16,
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 4,
  },
  labelRow: {
    width: SIZE,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  rangeLabel: {
    fontSize: 16,
    color: "#888",
    fontWeight: "600",
  },
});

export default TimeSlider;
