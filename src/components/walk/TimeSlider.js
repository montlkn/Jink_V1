import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Line, Text as SvgText } from "react-native-svg";

const SIZE = 240;
const SVG_PAD = 24; // padding around SVG to prevent label clipping
const CONTAINER_SIZE = SIZE + SVG_PAD * 2;
const CENTER = SIZE / 2;
const STROKE_WIDTH = 10;
const RADIUS = CENTER - STROKE_WIDTH;
const CONTAINER_CENTER = CONTAINER_SIZE / 2;
const TRACK_INNER_RADIUS = RADIUS - STROKE_WIDTH * 0.5;
const PRESS_MOVE_THRESHOLD = 8;
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
}) => {
  const range = Math.max(max - min, 1);
  const clampedValue = Math.min(max, Math.max(min, initialValue ?? min));
  const progress = (clampedValue - min) / range;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
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
            onPress();
          }
          trackingActiveRef.current = false;
          pressEligibleRef.current = false;
        },
        onPanResponderTerminate: () => {
          trackingActiveRef.current = false;
          pressEligibleRef.current = false;
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [min, onPress, range, updateGestureValue]
  );

  return (
    <View style={styles.container}>
      <View style={styles.wrapper}>
        <View style={styles.circleContainer} {...panResponder.panHandlers}>
          <Svg width={CONTAINER_SIZE} height={CONTAINER_SIZE}>
            <G transform={`translate(${SVG_PAD}, ${SVG_PAD})`}>
              <Circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                stroke="rgba(0,0,0,0.1)"
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
              {(() => {
                // Minor ticks every 5 minutes, excluding 0 and multiples of 15
                const minor = [];
                for (let m = min + 5; m < max; m += 5) {
                  if ((m - min) % 15 !== 0) minor.push(m);
                }
                return minor.map((mark) => {
                  const markProgress = (mark - min) / range;
                  const markAngle = markProgress * 2 * Math.PI - Math.PI / 2;
                  const outerX = CENTER + Math.cos(markAngle) * (RADIUS + 10);
                  const outerY = CENTER + Math.sin(markAngle) * (RADIUS + 10);
                  const innerX = CENTER + Math.cos(markAngle) * RADIUS;
                  const innerY = CENTER + Math.sin(markAngle) * RADIUS;
                  return (
                    <Line
                      key={`tick-minor-${mark}`}
                      x1={innerX}
                      y1={innerY}
                      x2={outerX}
                      y2={outerY}
                      stroke="rgba(0,0,0,0.18)"
                      strokeWidth={1}
                      strokeLinecap="round"
                    />
                  );
                });
              })()}
              {(() => {
                // Major ticks every 15 minutes (no 0 label)
                const major = [];
                for (let m = min + 15; m <= max; m += 15) major.push(m);
                return major.map((mark) => {
                  const markProgress = (mark - min) / range;
                  const markAngle = markProgress * 2 * Math.PI - Math.PI / 2;
                  const outerX = CENTER + Math.cos(markAngle) * (RADIUS + 18);
                  const outerY = CENTER + Math.sin(markAngle) * (RADIUS + 18);
                  const innerX = CENTER + Math.cos(markAngle) * RADIUS;
                  const innerY = CENTER + Math.sin(markAngle) * RADIUS;
                  const labelRadius = RADIUS + 28; // place labels just outside the track
                  const labelX = CENTER + Math.cos(markAngle) * labelRadius;
                  const labelY = CENTER + Math.sin(markAngle) * labelRadius + 6;
                  return (
                    <React.Fragment key={`tick-major-${mark}`}>
                      <Line
                        x1={innerX}
                        y1={innerY}
                        x2={outerX}
                        y2={outerY}
                        stroke="rgba(0,0,0,0.28)"
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                      <SvgText
                        x={labelX}
                        y={labelY}
                        fill="#444"
                        fontSize="12"
                        fontWeight="600"
                        textAnchor="middle"
                      >
                        {`${mark}`}
                      </SvgText>
                    </React.Fragment>
                  );
                });
              })()}
              <Circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                stroke="#000"
                strokeWidth={STROKE_WIDTH}
                fill="none"
                strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${CENTER} ${CENTER})`}
              />
              <Circle cx={thumbX} cy={thumbY} r={12} fill="#000" />
              <Circle cx={thumbX} cy={thumbY} r={6} fill="#fff" />
            </G>
          </Svg>
          <View pointerEvents="none" style={styles.valueContainer}>
            <Text style={styles.valueSubText}>press to start</Text>
          </View>
        </View>
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
  },
  valueContainer: {
    position: "absolute",
    alignItems: "center",
  },
  valueText: {
    fontSize: 48,
    fontWeight: "700",
    color: "#000",
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
