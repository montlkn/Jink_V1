import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";

const StreamingInstructionText = ({
  text = "Press orb to start jink",
  duration = 2400,
  baseColor = "#111",
  baseOpacity = 0.22,
  highlightColor = "#fff",
  fontSize = 16,
  letterSpacing = 1,
  style,
}) => {
  const [width, setWidth] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  const startLoop = useCallback(() => {
    progress.setValue(0);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [duration, progress]);

  useEffect(() => {
    const stop = startLoop();
    return stop;
  }, [startLoop]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <View
      style={[styles.container, style]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width || 0)}
    >
      {/* Dim base text for readability */}
      <Text
        style={[
          styles.text,
          {
            color: baseColor,
            opacity: baseOpacity,
            fontSize,
            letterSpacing,
          },
        ]}
      >
        {text}
      </Text>

      {/* Shimmer overlay masked by the same text */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={
            <View style={styles.maskCenter}> 
              <Text
                style={[
                  styles.text,
                  {
                    color: "#000",
                    opacity: 1,
                    fontSize,
                    letterSpacing,
                  },
                ]}
              >
                {text}
              </Text>
            </View>
          }
        >
          <Animated.View style={{ flex: 1, transform: [{ translateX }] }}>
            <LinearGradient
              colors={[
                "rgba(255,255,255,0)",
                highlightColor,
                "rgba(255,255,255,0)",
              ]}
              locations={[0.2, 0.5, 0.8]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
          <Animated.View
            style={{
              ...StyleSheet.absoluteFillObject,
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [width, -width],
                  }),
                },
              ],
            }}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0)", highlightColor, "rgba(255,255,255,0)"]}
              locations={[0.15, 0.5, 0.85]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
        </MaskedView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  maskCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "600",
    textTransform: "uppercase",
  },
});

export default StreamingInstructionText;
