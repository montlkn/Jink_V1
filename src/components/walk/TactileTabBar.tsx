import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { TactileButton } from "../tactile/TactileButton";
import { TactileView } from "../tactile/TactileView";

interface TactileTabBarProps {
  onScanPress?: () => void;
  onJinkPress?: () => void;
  onPassportPress?: () => void;
}

const INACTIVE_COLOR = theme.colors.muted;
const ACTIVE_COLOR = theme.colors.secondary;

export const TactileTabBar: React.FC<TactileTabBarProps> = ({
  onScanPress,
  onJinkPress,
  onPassportPress,
}) => {
  return (
    <TactileView style={styles.container} intensity={40} tint="light">
      <View style={styles.tabItem}>
        <TactileButton onPress={onScanPress} style={styles.iconButton} intensity={0}>
          <Ionicons name="scan-outline" size={24} color={INACTIVE_COLOR} />
          <Text style={styles.label}>Scan</Text>
        </TactileButton>
      </View>

      <View style={styles.tabItem}>
        <TactileButton
          onPress={onJinkPress}
          style={styles.activeButton}
          intensity={60} // Use higher intensity or specific style for active state
        >
             <Ionicons name="map" size={24} color={ACTIVE_COLOR} />
             {/* Use existing icon or map icon for "Jink" */}
             <Text style={[styles.label, styles.activeLabel]}>Jink</Text>
        </TactileButton>
      </View>

      <View style={styles.tabItem}>
        <TactileButton onPress={onPassportPress} style={styles.iconButton} intensity={0}>
          <Ionicons name="document-text-outline" size={24} color={INACTIVE_COLOR} />
          <Text style={styles.label}>Passport</Text>
        </TactileButton>
      </View>
    </TactileView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: 90,
    width: "90%",
    alignSelf: "center",
    borderRadius: 45,
    paddingBottom: 20, // Adjust for safe area if needed, or caller handles it
    paddingTop: 10,
    marginBottom: 30,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "transparent", 
    borderWidth: 0,
  },
  activeButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: 1,
    borderColor: theme.colors.white,
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    color: INACTIVE_COLOR,
    fontWeight: "600",
  },
  activeLabel: {
    color: ACTIVE_COLOR,
  }
});
