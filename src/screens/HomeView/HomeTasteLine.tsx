import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { screens, type RootParams } from "@/navigation/routes";
import { DEFAULT_TASTE_ACTION, type TasteAction } from "@/features/home/tasteActions";

type Props = {
  action?: TasteAction | null;
};

export default function HomeTasteLine({ action }: Props): JSX.Element {
  const navigation = useNavigation<NavigationProp<RootParams>>();
  const resolved = action ?? DEFAULT_TASTE_ACTION;

  const handlePress = () => {
    navigation.navigate(screens.WalkStart, { filters: resolved.filters });
  };

  return (
    <Pressable
      style={styles.container}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Start walk: ${action.headline}`}
      hitSlop={8}
    >
      <View style={styles.textWrapper}>
        <Text
          style={styles.headline}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {resolved.headline}
        </Text>
      </View>
      <Text style={styles.arrow} accessibilityElementsHidden>
        {"\u203A"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  textWrapper: {
    flex: 1,
    paddingRight: 12,
  },
  headline: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  arrow: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1A1A1A",
  },
});
