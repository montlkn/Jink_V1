// Compass.jsx
import * as Location from "expo-location";
import { Magnetometer } from "expo-sensors";
import React, { useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

/**
 * Minimal black & white compass (no shadows).
 * - Dial rotates with device heading
 * - Needle ALWAYS points to the FIRST building's coordinates
 * - Fixed black triangle at the top (12 o'clock)
 * - Red rim triangle + red rim dot that rotate with the needle (point to target)
 * - NEW: distance to target readout
 */

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
            timeInterval: 1500,
            distanceInterval: 1,
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
  const needleRotation = normalizeDeg(bearing - heading);
  const radius = (size - 20) / 2;

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <View
        style={[
          styles.wrap,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <View style={[styles.outer, { borderRadius: size / 2 }]}>
          <View
            style={[
              styles.inner,
              { borderRadius: radius, width: size - 20, height: size - 20 },
            ]}
          >
            {/* Fixed black top marker (12 o'clock) */}
            <View pointerEvents="none" style={styles.topMarkerOverlay}>
              <View style={styles.topMarkerTriangleBlack} />
            </View>

            {/* Rotating dial (letters + ticks) */}
            <View
              style={[
                styles.dial,
                { transform: [{ rotate: `${dialRotation}deg` }] },
              ]}
            >
              <Text style={[styles.cardinal, styles.north]}>N</Text>
              <Text style={[styles.cardinal, styles.south]}>S</Text>
              <Text style={[styles.cardinal, styles.east]}>E</Text>
              <Text style={[styles.cardinal, styles.west]}>W</Text>

              {Array.from({ length: 12 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.tick,
                    {
                      transform: [
                        { rotate: `${i * 30}deg` },
                        { translateY: -radius + 10 },
                      ],
                      width: i % 3 === 0 ? 3 : 1,
                      height: i % 3 === 0 ? 14 : 8,
                      backgroundColor: "#000",
                      opacity: i % 3 === 0 ? 0.8 : 0.4,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Red rim triangle (points to target) */}
            <View
              style={[
                styles.rimPointerOverlay,
                { transform: [{ rotate: `${needleRotation}deg` }] },
              ]}
            >
              <View
                style={[
                  styles.rimTriangleRed,
                  { transform: [{ translateY: -radius + 4 }] },
                ]}
              />
            </View>

            {/* Red rim dot (aligned with needle) */}
            <View
              style={[
                styles.rimDotOverlay,
                { transform: [{ rotate: `${needleRotation}deg` }] },
              ]}
            >
              <View
                style={[
                  styles.rimDot,
                  { transform: [{ translateY: -radius + 6 }] },
                ]}
              />
            </View>

            {/* Needle (points to target) */}
            <View style={styles.needleOverlay}>
              <View style={{ transform: [{ rotate: `${needleRotation}deg` }] }}>
                <View
                  style={{
                    width: 0,
                    height: 0,
                    borderLeftWidth: 6,
                    borderRightWidth: 6,
                    borderBottomWidth: size * 0.35,
                    borderLeftColor: "transparent",
                    borderRightColor: "transparent",
                    borderBottomColor: "#000",
                    alignSelf: "center",
                  }}
                />
                <View
                  style={{
                    width: 3,
                    height: size * 0.18,
                    backgroundColor: "#000",
                    borderRadius: 1.5,
                    alignSelf: "center",
                    marginTop: 6,
                  }}
                />
              </View>
            </View>

            {/* Center cap */}
            <View style={styles.cap} />
          </View>
        </View>

        {/* Minimal status (now includes distance) */}
        <View style={{ alignItems: "center", marginTop: 10 }}>
          {perm === "denied" ? (
            <Text style={styles.note}>Location permission denied</Text>
          ) : target ? (
            <>
              <Text style={styles.note}>
                heading {isFinite(heading) ? Math.round(heading) : "—"}°
                {Platform.OS === "android" ? " (mag)" : ""}
              </Text>
              {pos && (
                <>
                  <Text style={styles.note}>
                    bearing {Math.round(bearing)}°
                  </Text>
                  {distanceM != null && (
                    <Text style={styles.note}>
                      distance {formatDistance(distanceM)}
                    </Text>
                  )}
                </>
              )}
            </>
          ) : (
            <Text style={styles.note}>Add at least one building</Text>
          )}
        </View>
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

/* ---------- styles (BW minimal, no shadows) ---------- */
const styles = StyleSheet.create({
  wrap: {
    margin: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  outer: {
    backgroundColor: "#fff",
    padding: 10,
    borderWidth: 1,
    borderColor: "#000",
  },
  inner: {
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#000",
    position: "relative",
    overflow: "hidden",
  },

  // Rotating dial
  dial: {
    position: "absolute",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  // Fixed black top marker
  topMarkerOverlay: {
    position: "absolute",
    top: 2,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 5,
    pointerEvents: "none",
  },
  topMarkerTriangleBlack: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 12, // points downward into dial
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#000",
  },

  // Red rim triangle (rotates with needle)
  rimPointerOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
    pointerEvents: "none",
  },
  rimTriangleRed: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 12, // inward-pointing triangle
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#E11D48", // red
  },

  // Red rim dot (rotates with needle)
  rimDotOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center", // center, then translate Y to rim
    zIndex: 4,
    pointerEvents: "none",
  },
  rimDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E11D48", // red
    borderWidth: 2,
    borderColor: "#fff", // change to "#000" if your dial background is dark
  },

  // Needle overlay
  needleOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    pointerEvents: "none",
  },

  // Center cap
  cap: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#000",
    zIndex: 6,
  },

  // Cardinal labels
  cardinal: {
    position: "absolute",
    color: "#000",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  north: { top: 8, fontSize: 14 },
  south: { bottom: 8, fontSize: 14 },
  east: { right: 10, fontSize: 12 },
  west: { left: 10, fontSize: 12 },

  // Ticks
  tick: { position: "absolute", borderRadius: 1 },

  // Status
  note: { color: "#555", fontSize: 12, marginTop: 2 },
});
