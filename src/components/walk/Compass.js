// Compass.jsx
import * as Location from "expo-location";
import { Magnetometer } from "expo-sensors";
import { useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Svg, {
    Circle,
    Defs,
    G,
    Line,
    LinearGradient,
    Path,
    Polygon,
    RadialGradient,
    Stop,
    Text as SvgText,
} from "react-native-svg";

/**
 * Glass compass styled to match the Jink art direction.
 * - Dial rotates with device heading.
 * - Red rim pointer tracks true north.
 * - Green glass arrow points toward the active building relative to heading.
 * - Status block shows bearing/heading/distance metadata.
 */

const TICK_COUNT = 120;
const LABEL_VALUES = Array.from({ length: 12 }, (_, idx) => idx * 30);

export default function Compass({ buildings = [], size = 280, buildingIndex }) {
  const target = buildings[buildingIndex] ?? null;

  const [perm, setPerm] = useState("undetermined");
  const [pos, setPos] = useState(null); // { lat, lng }
  const [locHeading, setLocHeading] = useState(null); // deg
  const [magHeading, setMagHeading] = useState(null); // deg

  useEffect(() => {
    let headingSub, posSub, magSub;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPerm(status);

      if (status === "granted") {
        const init = await Location.getLastKnownPositionAsync();
        if (init?.coords) {
          setPos({ lat: init.coords.latitude, lng: init.coords.longitude });
        } else {
          const cur = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setPos({ lat: cur.coords.latitude, lng: cur.coords.longitude });
        }

        headingSub = await Location.watchHeadingAsync((h) => {
          const th = normalizeDeg(h.trueHeading);
          const mh = normalizeDeg(h.magHeading);
          setLocHeading(Number.isFinite(th) && th >= 0 ? th : mh);
        });

        posSub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 2000,  // Update every 2s (was 1.5s) - saves battery
            distanceInterval: 2,  // Require 2m movement
          },
          (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude })
        );
      }

      Magnetometer.setUpdateInterval(250);
      magSub = Magnetometer.addListener((data) => {
        setMagHeading(magnetometerToHeading(data));
      });
    })();

    return () => {
      headingSub?.remove?.();
      posSub?.remove?.();
      magSub?.remove?.();
    };
  }, []);

  const heading = useMemo(
    () => (isValidHeading(locHeading) ? locHeading : magHeading ?? 0),
    [locHeading, magHeading]
  );

  const bearing = useMemo(() => {
    if (!target || !pos) return 0;
    return bearingDeg(pos, target);
  }, [pos, target]);

  // NEW: distance (meters) to target
  const distanceM = useMemo(() => {
    if (!pos || !target) return null;
    return haversineMeters(pos, target);
  }, [pos, target]);

  const dialRotation = -heading;
  const northRotation = normalizeDeg(-heading);
  const targetRotation = normalizeDeg(bearing - heading);
  const center = size / 2;
  const rimRadius = center - size * 0.012;
  const dialRadius = rimRadius - size * 0.06;
  const majorTickLength = size * 0.07;
  const mediumTickLength = size * 0.045;
  const minorTickLength = size * 0.025;
  const arrowScale = (dialRadius * 1.6) / 206;
  const arrowWidth = 116 * arrowScale;
  const arrowX = center - arrowWidth / 2;
  const arrowY = center - dialRadius + size * 0.01;

  const tickElements = useMemo(() => {
    const list = [];
    for (let i = 0; i < TICK_COUNT; i += 1) {
      const angle = i * (360 / TICK_COUNT);
      const rad = ((angle - 90) * Math.PI) / 180;
      const isMajor = i % 10 === 0;
      const isMedium = !isMajor && i % 5 === 0;
      const length = isMajor
        ? majorTickLength
        : isMedium
        ? mediumTickLength
        : minorTickLength;
      const innerRadius = dialRadius - length;
      list.push(
        <Line
          key={`tick-${i}`}
          x1={center + Math.cos(rad) * innerRadius}
          y1={center + Math.sin(rad) * innerRadius}
          x2={center + Math.cos(rad) * dialRadius}
          y2={center + Math.sin(rad) * dialRadius}
          stroke="#111"
          strokeWidth={
            isMajor ? size * 0.006 : isMedium ? size * 0.004 : size * 0.0025
          }
          strokeLinecap="round"
          opacity={isMajor ? 0.88 : isMedium ? 0.65 : 0.35}
        />
      );
    }
    return list;
  }, [
    center,
    dialRadius,
    majorTickLength,
    mediumTickLength,
    minorTickLength,
    size,
  ]);

  const labelElements = useMemo(() => {
    const labelRadius = dialRadius - majorTickLength - size * 0.06;
    return LABEL_VALUES.map((angle) => {
      const rad = ((angle - 90) * Math.PI) / 180;
      const x = center + Math.cos(rad) * labelRadius;
      const y = center + Math.sin(rad) * labelRadius;
      return (
        <SvgText
          key={`label-${angle}`}
          x={x}
          y={y}
          fontSize={size * 0.06}
          fill="#1B1B1B"
          fontWeight="600"
          opacity={0.75}
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {angle === 0 ? "0" : angle.toString()}
        </SvgText>
      );
    });
  }, [center, dialRadius, majorTickLength, size]);

  const arrowGradientId = useMemo(
    () => `compassArrow-${Math.random().toString(36).slice(2, 10)}`,
    []
  );
  const faceGradientId = useMemo(
    () => `compassFace-${Math.random().toString(36).slice(2, 10)}`,
    []
  );
  const glowGradientId = useMemo(
    () => `compassGlow-${Math.random().toString(36).slice(2, 10)}`,
    []
  );
  const rimGradientId = useMemo(
    () => `compassRim-${Math.random().toString(36).slice(2, 10)}`,
    []
  );
  const centerGradientId = useMemo(
    () => `compassCenter-${Math.random().toString(36).slice(2, 10)}`,
    []
  );

  const bearingDegrees = Number.isFinite(bearing) ? Math.round(bearing) : null;
  const headingDegrees = Number.isFinite(heading) ? Math.round(heading) : null;
  const directionLabel =
    bearingDegrees != null ? bearingToCardinal(bearingDegrees) : null;
  const distanceText = distanceM != null ? formatDistance(distanceM) : null;
  const buildingName =
    target?.des_addres ?? target?.name ?? target?.title ?? target?.label ?? "";

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.dialOuter,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <RadialGradient
              id={glowGradientId}
              cx="50%"
              cy="50%"
              r="50%"
              fx="50%"
              fy="50%"
            >
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.9} />
              <Stop offset="70%" stopColor="#F4F6F8" stopOpacity={0.95} />
              <Stop offset="100%" stopColor="#E8EBEE" stopOpacity={1} />
            </RadialGradient>
            <LinearGradient
              id={rimGradientId}
              x1="50%"
              y1="0%"
              x2="50%"
              y2="100%"
            >
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.9} />
              <Stop offset="100%" stopColor="#CBD1D8" stopOpacity={0.9} />
            </LinearGradient>
            <RadialGradient
              id={faceGradientId}
              cx="50%"
              cy="50%"
              r="65%"
              fx="50%"
              fy="45%"
            >
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
              <Stop offset="60%" stopColor="#FAFBFC" stopOpacity={1} />
              <Stop offset="100%" stopColor="#ECEFF2" stopOpacity={1} />
            </RadialGradient>
            <LinearGradient
              id={arrowGradientId}
              x1="50%"
              y1="0%"
              x2="50%"
              y2="100%"
            >
              <Stop offset="0%" stopColor="#8EFF78" stopOpacity={1} />
              <Stop offset="100%" stopColor="#F5F5F5" stopOpacity={0.15} />
            </LinearGradient>
            <RadialGradient
              id={centerGradientId}
              cx="50%"
              cy="50%"
              r="50%"
              fx="50%"
              fy="50%"
            >
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={1} />
              <Stop offset="100%" stopColor="#D4D8DD" stopOpacity={1} />
            </RadialGradient>
          </Defs>

          <Circle
            cx={center}
            cy={center}
            r={rimRadius}
            fill={`url(#${glowGradientId})`}
          />
          <Circle
            cx={center}
            cy={center}
            r={rimRadius}
            stroke={`url(#${rimGradientId})`}
            strokeWidth={size * 0.018}
            fill="rgba(255,255,255,0.7)"
          />
          <Circle
            cx={center}
            cy={center}
            r={dialRadius}
            fill={`url(#${faceGradientId})`}
            stroke="rgba(255,255,255,0.9)"
            strokeWidth={size * 0.012}
          />

          <G transform={`rotate(${dialRotation} ${center} ${center})`}>
            {tickElements}
            {labelElements}
          </G>

          <G transform={`rotate(${northRotation} ${center} ${center})`}>
            <Polygon
              points={`${center},${
                center - rimRadius + size * 0.012
              } ${center - size * 0.036},${center - dialRadius - size * 0.002} ${
                center + size * 0.036
              },${center - dialRadius - size * 0.002}`}
              fill="#FF6B6B"
              opacity={0.82}
            />
            <Circle
              cx={center}
              cy={center - rimRadius - size * 0.018}
              r={size * 0.018}
              fill="#FF5A5F"
              stroke="#FFFFFF"
              strokeWidth={size * 0.004}
            />
          </G>

          <G transform={`rotate(${targetRotation} ${center} ${center})`}>
            <G transform={`translate(${arrowX} ${arrowY}) scale(${arrowScale})`}>
              <Path
                d="M47.735 196C47.735 201.523 52.2121 206 57.735 206C63.2578 206 67.735 201.523 67.735 196L57.735 196L47.735 196ZM57.735 0L-4.09833e-05 100L115.47 100L57.735 0ZM57.735 196L67.735 196L67.735 90L57.735 90L47.735 90L47.735 196L57.735 196Z"
                fill={`url(#${arrowGradientId})`}
              />
            </G>
          </G>

          <Circle
            cx={center}
            cy={center}
            r={size * 0.05}
            fill={`url(#${centerGradientId})`}
            stroke="rgba(120, 126, 135, 0.3)"
            strokeWidth={size * 0.004}
          />
        </Svg>
      </View>

      <View style={styles.statusBlock}>
        {perm === "denied" ? (
          <Text style={styles.statusNote}>Location permission denied</Text>
        ) : !target ? (
          <Text style={styles.statusNote}>Add at least one building</Text>
        ) : (
          <>
            <Text style={styles.statusPrimary}>
              {bearingDegrees != null
                ? `${bearingDegrees}°${
                    directionLabel ? ` ${directionLabel}` : ""
                  }`
                : "Calibrating"}
              {distanceText ? ` · ${distanceText}` : ""}
            </Text>
            <Text style={styles.statusSecondary}>
              {headingDegrees != null
                ? `Heading ${headingDegrees}°${
                    Platform.OS === "android" ? " (mag)" : ""
                  }`
                : "Aligning sensors..."}
            </Text>
            {buildingName ? (
              <Text style={styles.statusSecondary} numberOfLines={2}>
                Next: {buildingName}
              </Text>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

/* ---------- helpers ---------- */
const isValidHeading = (h) => Number.isFinite(h) && h >= 0 && h <= 360;
const normalizeDeg = (d) => ((d % 360) + 360) % 360;

// Haversine distance in meters
function haversineMeters(a, b) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371000; // meters
  const φ1 = toRad(a.lat),
    φ2 = toRad(b.lat);
  const dφ = toRad(b.lat - a.lat);
  const dλ = toRad(b.lng - a.lng);
  const s =
    Math.sin(dφ / 2) * Math.sin(dφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) * Math.sin(dλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R * c;
}

function formatDistance(m) {
  if (m < 1000) return `${Math.round(m)} m`;
  const km = m / 1000;
  return `${km < 10 ? km.toFixed(2) : km.toFixed(1)} km`;
}

function bearingDeg(from, to) {
  const toRad = (x) => (x * Math.PI) / 180;
  const φ1 = toRad(from.lat);
  const φ2 = toRad(to.lat);
  const Δλ = toRad(to.lng - from.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return normalizeDeg((Math.atan2(y, x) * 180) / Math.PI);
}

// Simple portrait-up conversion for magnetometer
function magnetometerToHeading({ x = 0, y = 0 }) {
  let angle = Math.atan2(y, x) * (180 / Math.PI);
  angle = 90 - angle;
  return normalizeDeg(angle);
}

const CARDINAL_DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

function bearingToCardinal(degrees) {
  if (!Number.isFinite(degrees)) return null;
  const normalized = normalizeDeg(degrees);
  const index = Math.round(normalized / 45) % CARDINAL_DIRECTIONS.length;
  return CARDINAL_DIRECTIONS[index];
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  dialOuter: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    shadowColor: "#0F172A",
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
    elevation: 12,
  },
  statusBlock: {
    marginTop: 24,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  statusPrimary: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B1B1B",
    textAlign: "center",
  },
  statusSecondary: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: "#3C3C43",
    opacity: 0.72,
    textAlign: "center",
  },
  statusNote: {
    fontSize: 14,
    lineHeight: 20,
    color: "#3C3C43",
    opacity: 0.72,
    textAlign: "center",
  },
});
