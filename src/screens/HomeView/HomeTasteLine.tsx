import {
  DEFAULT_TASTE_ACTION,
  type TasteAction,
} from "@/features/home/tasteActions";
import { screens, type RootParams } from "@/navigation/routes";
import { useOrbTransition } from "@/features/home";
import type { NavigationProp } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  action?: TasteAction | null;
};

const buildFallbackHeadline = (action: TasteAction | null | undefined): string => {
  const central = action?.central ?? DEFAULT_TASTE_ACTION.central;
  const label =
    typeof central?.label === "string" && central.label.trim().length
      ? central.label.trim()
      : DEFAULT_TASTE_ACTION.central.label;

  switch (central?.kind) {
    case "architect":
      return `Explore work by ${label}`;
    case "era":
      return `Explore ${label}`;
    case "style":
    default:
      return `Try ${label} nearby`;
  }
};

export default function HomeTasteLine({ action }: Props): JSX.Element {
  const navigation = useNavigation<NavigationProp<RootParams>>();
  const { startHomeToJinkTransition, pinToJink } = useOrbTransition();
  const resolved =
    action && typeof action.headline === "string" && action.headline.trim().length
      ? action
      : DEFAULT_TASTE_ACTION;
  const trimmedHeadline =
    typeof resolved.headline === "string" ? resolved.headline.trim() : "";
  const fallbackHeadline = buildFallbackHeadline(resolved);
  const headline = trimmedHeadline.length
    ? trimmedHeadline
    : fallbackHeadline.length
    ? fallbackHeadline
    : "No recent taste yet — complete a scan or quiz.";
  const finalHeadline =
    headline.trim().length > 0
      ? headline.trim()
      : "No recent taste yet — complete a scan or quiz.";
  const filters = resolved.filters ?? DEFAULT_TASTE_ACTION.filters;

  const handlePress = () => {
    startHomeToJinkTransition()
      .catch(() => false)
      .then((completed) => {
        navigation.navigate(screens.Main, {
          screen: screens.WalkStart,
          params: filters ? { filters } : undefined,
        });
        if (completed) {
          pinToJink(true);
        }
      });
  };

  return (
    <Pressable
      style={styles.container}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Start walk: ${headline}`}
      hitSlop={8}
    >
      <View style={styles.copyWrapper}>
        <Text style={styles.label}>Recent taste</Text>
        <Text style={styles.headline}>
          {finalHeadline}
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
    width: "100%",
    maxWidth: 340,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  copyWrapper: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  headline: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
    lineHeight: 20,
    flexWrap: "wrap",
  },
  arrow: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1A1A1A",
    marginLeft: 12,
  },
});
