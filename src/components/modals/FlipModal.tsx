import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';

type FlipModalProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

export function FlipModal({ visible, onClose, children }: FlipModalProps): JSX.Element {
  const rotateY = useSharedValue(180); // Start at 180 (back visible)
  const opacity = useSharedValue(0);

  // Shared values from reanimated don't need to be in dependency array
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      // Reset to 180 (back showing) then flip to 0 (front showing)
      rotateY.value = 180; // Ensure we start at back
      rotateY.value = withTiming(0, { duration: 600 });
    } else {
      const close = () => {
        // Optional: animate out? For now just hide
      };
      opacity.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) runOnJS(close)();
      });
    }
  // Shared values from reanimated don't need to be in dependency array
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateValue = interpolate(rotateY.value, [0, 180], [0, 180]);
    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${rotateValue}deg` },
      ],
      zIndex: rotateY.value <= 90 ? 2 : 0,
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateValue = interpolate(rotateY.value, [0, 180], [180, 360]);
    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${rotateValue}deg` },
      ],
      zIndex: rotateY.value > 90 ? 2 : 0,
    };
  });

  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const onGestureEvent = (event: any) => {
    const { translationY, velocityY } = event.nativeEvent;
    if (translationY > 100 || (velocityY > 500 && translationY > 50)) {
      onClose();
    }
  };

  if (!visible) return <></>;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PanGestureHandler onGestureEvent={onGestureEvent}>
          <Animated.View style={[styles.modalOverlay, containerStyle]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
            
            <View style={styles.cardContainer} onStartShouldSetResponder={() => true}>
          {/* Front Side (Content) */}
          <Animated.View style={[styles.cardFace, styles.frontFace, frontAnimatedStyle]}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              {children}
            </TouchableOpacity>
          </Animated.View>

          {/* Back Side (Placeholder) */}
          <Animated.View style={[styles.cardFace, styles.backFace, backAnimatedStyle]}>
             <View style={styles.backContent}>
                <Ionicons name="finger-print" size={64} color={theme.colors.muted} />
                <View style={styles.decorLine} />
                <View style={styles.decorLine} />
                <View style={styles.decorLine} />
             </View>
          </Animated.View>
        </View>

          </Animated.View>
        </PanGestureHandler>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(20, 20, 20, 0.85)", // Darker overlay
  },
  cardContainer: {
    width: '85%',
    maxWidth: 380,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFace: {
    backfaceVisibility: 'hidden',
    width: '100%',
  },
  frontFace: {
    // Relative positioning to define container height
    zIndex: 2,
  },
  backFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  backContent: {
    opacity: 0.3,
    alignItems: 'center',
    gap: 10,
  },
  decorLine: {
    width: 40,
    height: 2,
    backgroundColor: theme.colors.muted,
    marginVertical: 2,
  },
});

export default FlipModal;
