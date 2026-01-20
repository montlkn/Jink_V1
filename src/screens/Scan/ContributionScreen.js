import React from "react";
import { SafeAreaView, StyleSheet, Text } from "react-native";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";

const ContributionScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Share Your Discovery</Text>
      <Text style={styles.subtitle}>
        This screen will let you submit building photos and notes soon.
      </Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    padding: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.muted,
    textAlign: "center",
    lineHeight: 22,
  },
});

export default ContributionScreen;
